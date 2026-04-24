/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import * as cassandra from 'cassandra-driver';
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
const createdTables: string[] = [];

function cassandraConnectionParams() {
	return getTestData(mockFactory).cassandraTestConnection;
}

function buildCassandraClient(useKeyspace: boolean): cassandra.Client {
	const params = cassandraConnectionParams();
	return new cassandra.Client({
		contactPoints: [params.host],
		localDataCenter: params.dataCenter,
		keyspace: useKeyspace ? params.database : undefined,
		authProvider: new cassandra.auth.PlainTextAuthProvider(params.username, params.password),
		protocolOptions: { port: params.port },
	});
}

async function withCassandra<T>(fn: (client: cassandra.Client) => Promise<T>, useKeyspace = true): Promise<T> {
	const client = buildCassandraClient(useKeyspace);
	try {
		await client.connect();
		return await fn(client);
	} finally {
		await client.shutdown().catch(() => undefined);
	}
}

async function ensureKeyspace(): Promise<void> {
	const params = cassandraConnectionParams();
	await withCassandra(async (client) => {
		await client.execute(
			`CREATE KEYSPACE IF NOT EXISTS ${params.database} WITH REPLICATION = {'class': 'SimpleStrategy', 'replication_factor': 1}`,
		);
	}, false);
}

async function tableExists(tableName: string): Promise<boolean> {
	const params = cassandraConnectionParams();
	return withCassandra(async (client) => {
		const result = await client.execute(
			'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ? AND table_name = ?',
			[params.database, tableName.toLowerCase()],
			{ prepare: true },
		);
		return result.rows.length > 0;
	}, false);
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
	const params = cassandraConnectionParams();
	return withCassandra(async (client) => {
		const result = await client.execute(
			'SELECT column_name FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ? AND column_name = ?',
			[params.database, tableName.toLowerCase(), columnName.toLowerCase()],
			{ prepare: true },
		);
		return result.rows.length > 0;
	}, false);
}

async function dropTableIfExists(tableName: string): Promise<void> {
	await withCassandra(async (client) => {
		await client.execute(`DROP TABLE IF EXISTS ${tableName}`);
	});
}

async function seedTable(tableName: string, schema: string): Promise<void> {
	await withCassandra(async (client) => {
		await client.execute(`CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`);
	});
}

test.before(async () => {
	setSaasEnvVariable();
	await ensureKeyspace();
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
	const connectionToTestDB = cassandraConnectionParams();
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

test.serial('Cassandra: generate → approve creates a table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ca_t');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UUID PRIMARY KEY, name TEXT)`,
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
	const change = JSON.parse(generateResp.text);
	t.is(change.status, SchemaChangeStatusEnum.PENDING);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.true(await tableExists(tableName));
});

test.serial('Cassandra: generate → approve → rollback drops the table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ca_rb');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UUID PRIMARY KEY)`,
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
	const changeId = JSON.parse(generateResp.text).id;

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

test.serial('Cassandra: ADD column → approve adds the column; rollback removes it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ca_addcol');
	createdTables.push(tableName);

	await seedTable(tableName, 'id UUID PRIMARY KEY, name TEXT');

	nextProposal = {
		forwardSql: `ALTER TABLE ${tableName} ADD phone TEXT`,
		rollbackSql: `ALTER TABLE ${tableName} DROP phone`,
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
	t.true(await columnExists(tableName, 'phone'));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.false(await columnExists(tableName, 'phone'));
});

test.serial('Cassandra: DROP TABLE requires confirmedDestructive', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ca_drop');
	createdTables.push(tableName);

	await seedTable(tableName, 'id UUID PRIMARY KEY');

	nextProposal = {
		forwardSql: `DROP TABLE ${tableName}`,
		rollbackSql: `CREATE TABLE ${tableName} (id UUID PRIMARY KEY)`,
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
	const changeId = JSON.parse(generateResp.text).id;

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

test.serial('Cassandra: invalid CQL marks FAILED and attempts auto-rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ca_bad');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id NOTATYPE PRIMARY KEY)`,
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
	const changeId = JSON.parse(generateResp.text).id;

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

test.serial('Cassandra: userModifiedSql is validated and applied in place of AI SQL', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ca_um');
	createdTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UUID PRIMARY KEY, foo TEXT)`,
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
	const changeId = JSON.parse(generateResp.text).id;

	const editedSql = `CREATE TABLE ${tableName} (id UUID PRIMARY KEY, bar TEXT)`;
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedSql });
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).userModifiedSql, editedSql);
	t.true(await columnExists(tableName, 'bar'));
	t.false(await columnExists(tableName, 'foo'));
});

test.serial('Cassandra: userModifiedSql with a forbidden construct is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ca_umbad');

	nextProposal = {
		forwardSql: `CREATE TABLE ${tableName} (id UUID PRIMARY KEY)`,
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
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: `GRANT ALL ON ${tableName} TO cassandra` });
	t.is(approveResp.status, 400);

	const getResp = await request(app.getHttpServer()).get(`/table-schema/change/${changeId}`).set('Cookie', token);
	t.is(JSON.parse(getResp.text).status, SchemaChangeStatusEnum.PENDING);
	t.false(await tableExists(tableName));
});
