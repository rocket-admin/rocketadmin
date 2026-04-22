/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import ibmdb from 'ibm_db';
import request from 'supertest';
import { AICoreService } from '../../../src/ai-core/index.js';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import {
	SchemaChangeStatusEnum,
	SchemaChangeTypeEnum,
} from '../../../src/entities/table-schema/table-schema-change-enums.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

interface ProposedChange {
	forwardSql: string;
	rollbackSql: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	isReversible: boolean;
	summary: string;
	reasoning: string;
}

let nextProposal: ProposedChange | null = null;

function createProposalStream(proposal: ProposedChange) {
	return {
		*[Symbol.asyncIterator]() {
			yield {
				type: 'tool_call',
				toolCall: {
					id: faker.string.uuid(),
					name: 'proposeSchemaChange',
					arguments: proposal,
				},
				responseId: faker.string.uuid(),
			};
		},
	};
}

const mockAICoreService = {
	streamChatWithToolsAndProvider: async () => {
		if (!nextProposal) throw new Error('Test must set nextProposal.');
		return createProposalStream(nextProposal);
	},
	complete: async () => 'mocked',
	chat: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => createProposalStream(nextProposal!),
	chatWithToolsAndProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	completeWithProvider: async () => 'mocked',
	chatWithProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueAfterToolCall: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueStreamingAfterToolCall: async () => createProposalStream(nextProposal!),
	getDefaultProvider: () => 'openai',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;

function buildConnStr(params: any): string {
	return `DATABASE=${params.database};HOSTNAME=${params.host};UID=${params.username};PWD=${params.password};PORT=${params.port};PROTOCOL=TCPIP`;
}

async function ensureSchema(params: any): Promise<void> {
	const db = ibmdb();
	await db.open(buildConnStr(params));
	try {
		const exists = (await db.query(
			`SELECT COUNT(*) AS C FROM SYSCAT.SCHEMATA WHERE SCHEMANAME = '${params.schema}'`,
		)) as Array<{ C: number }>;
		if (!exists[0] || !exists[0].C) {
			await db.query(`CREATE SCHEMA ${params.schema}`);
		}
	} finally {
		await db.close();
	}
}

async function queryDb2<T = any>(params: any, sql: string): Promise<T[]> {
	const db = ibmdb();
	await db.open(buildConnStr(params));
	try {
		return (await db.query(sql)) as T[];
	} finally {
		await db.close();
	}
}

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	})
		.overrideProvider(AICoreService)
		.useValue(mockAICoreService)
		.compile();

	_testUtils = moduleFixture.get<TestUtils>(TestUtils);
	app = moduleFixture.createNestApplication();
	app.use(cookieParser());
	app.useGlobalFilters(new AllExceptionsFilter(app.get(WinstonLogger)));
	app.useGlobalPipes(
		new ValidationPipe({
			exceptionFactory(validationErrors: ValidationError[] = []) {
				return new ValidationException(validationErrors);
			},
		}),
	);
	await app.init();
	await createInitialTestUser(app);
	app.getHttpServer().listen(0);

	await ensureSchema(getTestData(mockFactory).connectionToIbmDb2);
});

test.after(async () => {
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string): Promise<string> {
	const connectionToTestDB = getTestData(mockFactory).connectionToIbmDb2;
	const resp = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json');
	if (resp.status !== 201) {
		throw new Error(`Failed to create connection: ${resp.status} ${resp.text}`);
	}
	return JSON.parse(resp.text).id;
}

function randomTableName(prefix: string): string {
	return `${prefix}_${faker.string.alphanumeric(6).toUpperCase()}`;
}

function qualifyName(tableName: string): string {
	const schema = getTestData(mockFactory).connectionToIbmDb2.schema;
	return `${schema}.${tableName}`;
}

async function tableExists(tableName: string): Promise<boolean> {
	const params = getTestData(mockFactory).connectionToIbmDb2;
	const rows = await queryDb2<{ C: number }>(
		params,
		`SELECT COUNT(*) AS C FROM SYSCAT.TABLES WHERE TABSCHEMA = '${params.schema}' AND TABNAME = '${tableName}'`,
	);
	return Number(rows[0]?.C ?? 0) > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
	const params = getTestData(mockFactory).connectionToIbmDb2;
	const rows = await queryDb2<{ C: number }>(
		params,
		`SELECT COUNT(*) AS C FROM SYSCAT.COLUMNS WHERE TABSCHEMA = '${params.schema}' AND TABNAME = '${tableName}' AND COLNAME = '${columnName}'`,
	);
	return Number(rows[0]?.C ?? 0) > 0;
}

async function columnLength(tableName: string, columnName: string): Promise<number | null> {
	const params = getTestData(mockFactory).connectionToIbmDb2;
	const rows = await queryDb2<{ LENGTH: number }>(
		params,
		`SELECT LENGTH FROM SYSCAT.COLUMNS WHERE TABSCHEMA = '${params.schema}' AND TABNAME = '${tableName}' AND COLNAME = '${columnName}'`,
	);
	return rows[0]?.LENGTH ?? null;
}

test.serial('DB2: generate → approve creates the table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('RA_T');

	nextProposal = {
		forwardSql: `CREATE TABLE ${qualifyName(tableName)} (ID BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, NAME VARCHAR(255))`,
		rollbackSql: `DROP TABLE ${qualifyName(tableName)}`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'db2 create',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create table' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);

	t.true(await tableExists(tableName));
});

test.serial('DB2: ADD COLUMN approve adds the column; rollback removes it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('RA_ADDCOL');

	const params = getTestData(mockFactory).connectionToIbmDb2;
	await queryDb2(
		params,
		`CREATE TABLE ${qualifyName(tableName)} (ID BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY)`,
	);

	nextProposal = {
		forwardSql: `ALTER TABLE ${qualifyName(tableName)} ADD COLUMN PHONE VARCHAR(255)`,
		rollbackSql: `ALTER TABLE ${qualifyName(tableName)} DROP COLUMN PHONE`,
		changeType: SchemaChangeTypeEnum.ADD_COLUMN,
		targetTableName: tableName,
		isReversible: true,
		summary: 'add phone',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'add phone column' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.true(await columnExists(tableName, 'PHONE'));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.false(await columnExists(tableName, 'PHONE'));
});

test.serial('DB2: ALTER COLUMN SET DATA TYPE widens VARCHAR(32) → VARCHAR(255) preserving rows', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('RA_ALT');

	const params = getTestData(mockFactory).connectionToIbmDb2;
	await queryDb2(params, `CREATE TABLE ${qualifyName(tableName)} (ID INTEGER PRIMARY KEY NOT NULL, NAME VARCHAR(32))`);
	await queryDb2(params, `INSERT INTO ${qualifyName(tableName)} (ID, NAME) VALUES (1, 'alice')`);
	await queryDb2(params, `INSERT INTO ${qualifyName(tableName)} (ID, NAME) VALUES (2, 'bob')`);
	await queryDb2(params, `INSERT INTO ${qualifyName(tableName)} (ID, NAME) VALUES (3, 'carol')`);

	nextProposal = {
		forwardSql: `ALTER TABLE ${qualifyName(tableName)} ALTER COLUMN NAME SET DATA TYPE VARCHAR(255)`,
		rollbackSql: `ALTER TABLE ${qualifyName(tableName)} ALTER COLUMN NAME SET DATA TYPE VARCHAR(32)`,
		changeType: SchemaChangeTypeEnum.ALTER_COLUMN,
		targetTableName: tableName,
		isReversible: true,
		summary: 'widen name',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'widen name' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	const length = await columnLength(tableName, 'NAME');
	t.is(length, 255);

	const rows = await queryDb2<{ NAME: string; ID: number }>(
		params,
		`SELECT ID, NAME FROM ${qualifyName(tableName)} ORDER BY ID`,
	);
	t.deepEqual(
		rows.map((r) => r.NAME),
		['alice', 'bob', 'carol'],
	);
});
