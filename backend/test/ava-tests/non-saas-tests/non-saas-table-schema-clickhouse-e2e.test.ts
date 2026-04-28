/* eslint-disable @typescript-eslint/no-unused-vars */
import { ClickHouseClient, createClient } from '@clickhouse/client';
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
const createdTables: string[] = [];

function clickHouseConnectionParams() {
	return getTestData(mockFactory).clickhouseTestConnection;
}

function buildClickHouseClient(): ClickHouseClient {
	const params = clickHouseConnectionParams();
	return createClient({
		url: `http://${params.host}:${params.port}`,
		username: params.username ?? 'default',
		password: params.password ?? '',
		database: params.database ?? 'default',
	});
}

async function withClickHouse<T>(fn: (client: ClickHouseClient) => Promise<T>): Promise<T> {
	const client = buildClickHouseClient();
	try {
		return await fn(client);
	} finally {
		await client.close();
	}
}

async function tableExists(tableName: string): Promise<boolean> {
	return withClickHouse(async (client) => {
		const params = clickHouseConnectionParams();
		const result = await client.query({
			query: `SELECT count() AS c FROM system.tables WHERE database = {db:String} AND name = {t:String}`,
			query_params: { db: params.database ?? 'default', t: tableName },
			format: 'JSONEachRow',
		});
		const rows = (await result.json()) as Array<{ c: number | string }>;
		return Number(rows[0]?.c ?? 0) > 0;
	});
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
	return withClickHouse(async (client) => {
		const params = clickHouseConnectionParams();
		const result = await client.query({
			query: `SELECT count() AS c FROM system.columns WHERE database = {db:String} AND table = {t:String} AND name = {c:String}`,
			query_params: { db: params.database ?? 'default', t: tableName, c: columnName },
			format: 'JSONEachRow',
		});
		const rows = (await result.json()) as Array<{ c: number | string }>;
		return Number(rows[0]?.c ?? 0) > 0;
	});
}

async function getColumnType(tableName: string, columnName: string): Promise<string | null> {
	return withClickHouse(async (client) => {
		const params = clickHouseConnectionParams();
		const result = await client.query({
			query: `SELECT type FROM system.columns WHERE database = {db:String} AND table = {t:String} AND name = {c:String}`,
			query_params: { db: params.database ?? 'default', t: tableName, c: columnName },
			format: 'JSONEachRow',
		});
		const rows = (await result.json()) as Array<{ type: string }>;
		return rows[0]?.type ?? null;
	});
}

async function dropTableIfExists(tableName: string): Promise<void> {
	await withClickHouse(async (client) => {
		await client.command({ query: `DROP TABLE IF EXISTS ${tableName}` });
	});
}

async function seedTable(tableName: string, orderByColumn: string, schema: string): Promise<void> {
	await withClickHouse(async (client) => {
		await client.command({
			query: `CREATE TABLE IF NOT EXISTS ${tableName} (${schema}) ENGINE = MergeTree() ORDER BY ${orderByColumn}`,
		});
	});
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
});

test.after(async () => {
	try {
		for (const name of createdTables) {
			await dropTableIfExists(name);
		}
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string): Promise<string> {
	const connectionToTestDB = clickHouseConnectionParams();
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
	return `${prefix}_${faker.string.alphanumeric(6).toLowerCase()}`;
}

test.serial('ClickHouse: generate → approve creates a MergeTree table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_t');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UInt32, name String) ENGINE = MergeTree() ORDER BY id`,
		rollbackSql: `DROP TABLE ${tableName}`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: `Create ${tableName}`,
		reasoning: 'basic create',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: `create ${tableName}` });
	t.is(generateResp.status, 201);
	const change = JSON.parse(generateResp.text).changes[0];
	t.is(change.status, SchemaChangeStatusEnum.PENDING);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.true(await tableExists(tableName));
});

test.serial('ClickHouse: generate → approve → rollback drops the table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_rb');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UInt32) ENGINE = MergeTree() ORDER BY id`,
		rollbackSql: `DROP TABLE ${tableName}`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'rollback test',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create then rollback' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	await request(app.getHttpServer()).post(`/table-schema/change/${changeId}/approve`).set('Cookie', token).send({});

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.is(JSON.parse(rollbackResp.text).status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.false(await tableExists(tableName));

	const listResp = await request(app.getHttpServer()).get(`/table-schema/${connectionId}/changes`).set('Cookie', token);
	const list = JSON.parse(listResp.text);
	const auditRow = list.data.find(
		(c: any) => c.changeType === SchemaChangeTypeEnum.ROLLBACK && c.previousChangeId === changeId,
	);
	t.truthy(auditRow, 'expected linked rollback audit row');
});

test.serial('ClickHouse: ADD COLUMN → approve adds the column; rollback removes it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_addcol');
	createdTables.push(tableName);

	await seedTable(tableName, 'id', 'id UInt32, name String');

	nextProposal = {
		forwardSql: `ALTER TABLE ${tableName} ADD COLUMN phone String`,
		rollbackSql: `ALTER TABLE ${tableName} DROP COLUMN phone`,
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
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.true(await columnExists(tableName, 'phone'));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.false(await columnExists(tableName, 'phone'));
});

test.serial('ClickHouse: DROP TABLE requires confirmedDestructive', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_drop');
	createdTables.push(tableName);

	await seedTable(tableName, 'id', 'id UInt32');

	nextProposal = {
		forwardSql: `DROP TABLE ${tableName}`,
		rollbackSql: `CREATE TABLE ${tableName} (id UInt32) ENGINE = MergeTree() ORDER BY id`,
		changeType: SchemaChangeTypeEnum.DROP_TABLE,
		targetTableName: tableName,
		isReversible: false,
		summary: 'destructive',
		reasoning: 'user wants to drop',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'drop it' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const firstApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(firstApprove.status, 400);
	t.is(firstApprove.body?.type, 'destructive_confirmation_required');
	t.true(await tableExists(tableName), 'table must still exist');

	const secondApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(secondApprove.status, 200);
	t.is(JSON.parse(secondApprove.text).status, SchemaChangeStatusEnum.APPLIED);
	t.false(await tableExists(tableName));
});

test.serial('ClickHouse: ALTER COLUMN MODIFY preserves row data when widening', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_alt');
	createdTables.push(tableName);

	// Seed a FixedString(16) column and populate; then widen to a variable-length String.
	await withClickHouse(async (client) => {
		await client.command({
			query: `CREATE TABLE ${tableName} (id UInt32, name FixedString(16)) ENGINE = MergeTree() ORDER BY id`,
		});
		await client.insert({
			table: tableName,
			values: [
				{ id: 1, name: 'alice' },
				{ id: 2, name: 'bob' },
				{ id: 3, name: 'carol' },
			],
			format: 'JSONEachRow',
		});
	});

	nextProposal = {
		forwardSql: `ALTER TABLE ${tableName} MODIFY COLUMN name String`,
		rollbackSql: `ALTER TABLE ${tableName} MODIFY COLUMN name FixedString(16)`,
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
	t.is(await getColumnType(tableName, 'name'), 'String');

	const rows = await withClickHouse(async (client) => {
		const result = await client.query({
			query: `SELECT id, name FROM ${tableName} ORDER BY id`,
			format: 'JSONEachRow',
		});
		return (await result.json()) as Array<{ id: number; name: string }>;
	});
	// FixedString pads with NUL bytes on insert; trim them when asserting content.
	t.deepEqual(
		rows.map((r) => r.name.replace(/\0+$/, '')),
		['alice', 'bob', 'carol'],
	);
});

test.serial('ClickHouse: invalid SQL marks FAILED and attempts auto-rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_bad');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id NOTATYPE) ENGINE = MergeTree() ORDER BY id`,
		rollbackSql: `DROP TABLE IF EXISTS ${tableName}`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'bad',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'bad sql' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 400);

	const getResp = await request(app.getHttpServer()).get(`/table-schema/change/${changeId}`).set('Cookie', token);
	const record = JSON.parse(getResp.text);
	t.is(record.status, SchemaChangeStatusEnum.FAILED);
	t.true(record.autoRollbackAttempted);
	t.truthy(record.executionError);
	t.false(await tableExists(tableName));
});

test.serial('ClickHouse: userModifiedSql is validated and applied in place of AI SQL', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_um');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UInt32, foo String) ENGINE = MergeTree() ORDER BY id`,
		rollbackSql: `DROP TABLE ${tableName}`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'original',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const editedSql = `CREATE TABLE ${tableName} (id UInt32, bar String) ENGINE = MergeTree() ORDER BY id`;
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedSql });
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).userModifiedSql, editedSql);
	t.true(await columnExists(tableName, 'bar'));
	t.false(await columnExists(tableName, 'foo'));
});

test.serial('ClickHouse: userModifiedSql with a forbidden construct is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ch_umbad');

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UInt32) ENGINE = MergeTree() ORDER BY id`,
		rollbackSql: `DROP TABLE ${tableName}`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'valid original',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: `GRANT ALL ON ${tableName} TO default` });
	t.is(approveResp.status, 400);

	const getResp = await request(app.getHttpServer()).get(`/table-schema/change/${changeId}`).set('Cookie', token);
	t.is(JSON.parse(getResp.text).status, SchemaChangeStatusEnum.PENDING);
	t.false(await tableExists(tableName));
});
