/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
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
import { dropTestTables } from '../../utils/drop-test-tables.js';
import { getTestData } from '../../utils/get-test-data.js';
import { getTestKnex } from '../../utils/get-test-knex.js';
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
					arguments: { proposals: [proposal] },
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
const testTables: Array<string> = [];

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
});

test.after(async () => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToOracleDB;
		await dropTestTables(testTables, connectionToTestDB);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string): Promise<string> {
	const connectionToTestDB = getTestData(mockFactory).connectionToOracleDB;
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

function oracleKnex() {
	return getTestKnex(getTestData(mockFactory).connectionToOracleDB);
}

function randomOracleTableName(prefix: string): string {
	return `${prefix}_${faker.string.alphanumeric(6).toLowerCase()}`.toUpperCase();
}

test.serial('Oracle: generate → approve creates the table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomOracleTableName('RA_T');
	testTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id NUMBER PRIMARY KEY, name VARCHAR2(255))`,
		rollbackSql: `DROP TABLE ${tableName}`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'oracle create',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create table' });
	t.is(generateResp.status, 201);
	const change = JSON.parse(generateResp.text).changes[0];

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);

	t.true(await oracleKnex().schema.hasTable(tableName));
});

async function oracleColumnExists(tableName: string, columnName: string): Promise<boolean> {
	const rows = await oracleKnex().raw(
		`SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t AND COLUMN_NAME = :c`,
		{ t: tableName, c: columnName },
	);
	const cnt = (rows as any)[0]?.CNT ?? (rows as any).rows?.[0]?.CNT ?? 0;
	return Number(cnt) > 0;
}

test.serial('Oracle: ADD COLUMN approve adds the column; rollback removes it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomOracleTableName('RA_ADDCOL');
	testTables.push(tableName);

	const knex = oracleKnex();
	await knex.raw(`CREATE TABLE ${tableName} (ID NUMBER PRIMARY KEY)`);

	nextProposal = {
		forwardSql: `ALTER TABLE ${tableName} ADD PHONE VARCHAR2(255)`,
		rollbackSql: `ALTER TABLE ${tableName} DROP COLUMN PHONE`,
		changeType: SchemaChangeTypeEnum.ADD_COLUMN,
		targetTableName: tableName,
		isReversible: true,
		summary: 'add phone',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'add phone' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.true(await oracleColumnExists(tableName, 'PHONE'));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.false(await oracleColumnExists(tableName, 'PHONE'));
});

test.serial('Oracle: ALTER COLUMN widens VARCHAR2(32) → VARCHAR2(255) preserving row data', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomOracleTableName('RA_ALT');
	testTables.push(tableName);

	const knex = oracleKnex();
	await knex.raw(`CREATE TABLE ${tableName} (ID NUMBER PRIMARY KEY, NAME VARCHAR2(32))`);
	await knex.raw(`INSERT INTO ${tableName} (ID, NAME) VALUES (1, 'alice')`);
	await knex.raw(`INSERT INTO ${tableName} (ID, NAME) VALUES (2, 'bob')`);
	await knex.raw(`INSERT INTO ${tableName} (ID, NAME) VALUES (3, 'carol')`);
	await knex.raw('COMMIT');

	nextProposal = {
		forwardSql: `ALTER TABLE ${tableName} MODIFY NAME VARCHAR2(255)`,
		rollbackSql: `ALTER TABLE ${tableName} MODIFY NAME VARCHAR2(32)`,
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
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	const colMeta = await knex.raw(
		`SELECT DATA_LENGTH FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t AND COLUMN_NAME = 'NAME'`,
		{ t: tableName },
	);
	const lenValue = Number((colMeta as any)[0]?.DATA_LENGTH ?? (colMeta as any).rows?.[0]?.DATA_LENGTH);
	t.is(lenValue, 255);

	const rows = (await knex.raw(`SELECT ID, NAME FROM ${tableName} ORDER BY ID`)) as any;
	const list = Array.isArray(rows) ? rows : (rows.rows ?? []);
	t.deepEqual(
		list.map((r: any) => r.NAME ?? r.name),
		['alice', 'bob', 'carol'],
	);
});
