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
		const connectionToTestDB = getTestData(mockFactory).connectionToTestMSSQL;
		await dropTestTables(testTables, connectionToTestDB);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string): Promise<string> {
	const connectionToTestDB = getTestData(mockFactory).connectionToTestMSSQL;
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

function mssqlKnex() {
	return getTestKnex(getTestData(mockFactory).connectionToTestMSSQL);
}

test.serial('MSSQL: generate → approve creates the table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_t_${faker.string.alphanumeric(8).toLowerCase()}`;
	testTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE [${tableName}] (id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(255))`,
		rollbackSql: `DROP TABLE [${tableName}]`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'mssql create',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create table' });
	t.is(generateResp.status, 201);
	const change = JSON.parse(generateResp.text).changes[0];
	t.is(change.status, SchemaChangeStatusEnum.PENDING);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);

	t.true(await mssqlKnex().schema.hasTable(tableName));
});

test.serial('MSSQL: generate → approve → rollback removes table and links audit row', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_t_${faker.string.alphanumeric(8).toLowerCase()}`;
	testTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE [${tableName}] (id INT IDENTITY(1,1) PRIMARY KEY)`,
		rollbackSql: `DROP TABLE [${tableName}]`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'rollback test',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	await request(app.getHttpServer()).post(`/table-schema/change/${changeId}/approve`).set('Cookie', token).send({});

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.is(JSON.parse(rollbackResp.text).status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.false(await mssqlKnex().schema.hasTable(tableName));

	const listResp = await request(app.getHttpServer()).get(`/table-schema/${connectionId}/changes`).set('Cookie', token);
	const list = JSON.parse(listResp.text);
	const rollbackAuditRow = list.data.find(
		(c: any) => c.changeType === SchemaChangeTypeEnum.ROLLBACK && c.previousChangeId === changeId,
	);
	t.truthy(rollbackAuditRow, 'Expected a linked rollback audit row');
});

test.serial('MSSQL: invalid SQL marks FAILED and attempts auto-rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_bad_${faker.string.alphanumeric(6).toLowerCase()}`;

	nextProposal = {
		forwardSql: `CREATE TABLE [${tableName}] (id INVALIDTYPE)`,
		rollbackSql: `IF OBJECT_ID('${tableName}', 'U') IS NOT NULL DROP TABLE [${tableName}]`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'invalid',
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
	t.false(await mssqlKnex().schema.hasTable(tableName));
});

test.serial('MSSQL: destructive DROP TABLE requires confirmedDestructive=true', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const seedTableName = `ra_seed_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(seedTableName);

	const knex = mssqlKnex();
	await knex.schema.createTable(seedTableName, (table) => {
		table.increments();
	});

	nextProposal = {
		forwardSql: `DROP TABLE [${seedTableName}]`,
		rollbackSql: `CREATE TABLE [${seedTableName}] (id INT IDENTITY(1,1) PRIMARY KEY)`,
		changeType: SchemaChangeTypeEnum.DROP_TABLE,
		targetTableName: seedTableName,
		isReversible: false,
		summary: 'drop existing',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'drop it' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const firstApproveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(firstApproveResp.status, 400);
	t.is(firstApproveResp.body?.type, 'destructive_confirmation_required');
	t.true(await knex.schema.hasTable(seedTableName));

	const secondApproveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(secondApproveResp.status, 200);
	t.is(JSON.parse(secondApproveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.false(await knex.schema.hasTable(seedTableName));
});

test.serial('MSSQL: ADD COLUMN approve adds the column; rollback removes it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_addcol_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	const knex = mssqlKnex();
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
	});

	nextProposal = {
		forwardSql: `ALTER TABLE [${tableName}] ADD [phone] NVARCHAR(255)`,
		rollbackSql: `ALTER TABLE [${tableName}] DROP COLUMN [phone]`,
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
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.true(await knex.schema.hasColumn(tableName, 'phone'));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.false(await knex.schema.hasColumn(tableName, 'phone'));
});

test.serial('MSSQL: DROP COLUMN blocked without confirmedDestructive, succeeds with it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_dropcol_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	const knex = mssqlKnex();
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
		table.string('phone', 255);
	});

	nextProposal = {
		forwardSql: `ALTER TABLE [${tableName}] DROP COLUMN [phone]`,
		rollbackSql: `ALTER TABLE [${tableName}] ADD [phone] NVARCHAR(255)`,
		changeType: SchemaChangeTypeEnum.DROP_COLUMN,
		targetTableName: tableName,
		isReversible: false,
		summary: 'drop phone',
		reasoning: 'destructive',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'drop phone column' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const firstApproveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(firstApproveResp.status, 400);
	t.is(firstApproveResp.body?.type, 'destructive_confirmation_required');
	t.true(await knex.schema.hasColumn(tableName, 'phone'));

	const secondApproveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(secondApproveResp.status, 200);
	t.is(JSON.parse(secondApproveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.false(await knex.schema.hasColumn(tableName, 'phone'));
});

test.serial('MSSQL: ADD INDEX approve creates the index; rollback drops it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_idx_${faker.string.alphanumeric(6).toLowerCase()}`;
	const indexName = `ix_${tableName}_email`;
	testTables.push(tableName);

	const knex = mssqlKnex();
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
		table.string('email', 255);
	});

	nextProposal = {
		forwardSql: `CREATE INDEX [${indexName}] ON [${tableName}] ([email])`,
		rollbackSql: `DROP INDEX [${indexName}] ON [${tableName}]`,
		changeType: SchemaChangeTypeEnum.ADD_INDEX,
		targetTableName: tableName,
		isReversible: true,
		summary: 'add email index',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'add index' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	const afterAdd = await knex.raw(`SELECT COUNT(*) AS c FROM sys.indexes WHERE name = ? AND object_id = OBJECT_ID(?)`, [
		indexName,
		tableName,
	]);
	t.is(Number((afterAdd as any)[0].c), 1);

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);

	const afterRollback = await knex.raw(
		`SELECT COUNT(*) AS c FROM sys.indexes WHERE name = ? AND object_id = OBJECT_ID(?)`,
		[indexName, tableName],
	);
	t.is(Number((afterRollback as any)[0].c), 0);
});

test.serial('MSSQL: ADD FOREIGN KEY with cross-table reference; rollback drops it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const parentName = `ra_par_${faker.string.alphanumeric(6).toLowerCase()}`;
	const childName = `ra_ch_${faker.string.alphanumeric(6).toLowerCase()}`;
	const fkName = `fk_${childName}_parent`;
	testTables.push(parentName, childName);

	const knex = mssqlKnex();
	await knex.schema.createTable(parentName, (table) => {
		table.increments();
	});
	await knex.schema.createTable(childName, (table) => {
		table.increments();
		table.integer('parent_id').notNullable();
	});

	nextProposal = {
		forwardSql: `ALTER TABLE [${childName}] ADD CONSTRAINT [${fkName}] FOREIGN KEY ([parent_id]) REFERENCES [${parentName}] ([id])`,
		rollbackSql: `ALTER TABLE [${childName}] DROP CONSTRAINT [${fkName}]`,
		changeType: SchemaChangeTypeEnum.ADD_FOREIGN_KEY,
		targetTableName: childName,
		isReversible: true,
		summary: 'add fk',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'add fk' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	const afterAdd = await knex.raw(`SELECT COUNT(*) AS c FROM sys.foreign_keys WHERE name = ?`, [fkName]);
	t.is(Number((afterAdd as any)[0].c), 1);

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);

	const afterRollback = await knex.raw(`SELECT COUNT(*) AS c FROM sys.foreign_keys WHERE name = ?`, [fkName]);
	t.is(Number((afterRollback as any)[0].c), 0);
});

test.serial('MSSQL: userModifiedSql is validated and applied in place of AI SQL', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_um_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE [${tableName}] (id INT IDENTITY(1,1) PRIMARY KEY, foo NVARCHAR(255))`,
		rollbackSql: `DROP TABLE [${tableName}]`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'ai original',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create table' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const editedSql = `CREATE TABLE [${tableName}] (id INT IDENTITY(1,1) PRIMARY KEY, bar NVARCHAR(255))`;
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedSql });
	t.is(approveResp.status, 200);
	const applied = JSON.parse(approveResp.text);
	t.is(applied.status, SchemaChangeStatusEnum.APPLIED);
	t.is(applied.userModifiedSql, editedSql);

	const knex = mssqlKnex();
	t.true(await knex.schema.hasColumn(tableName, 'bar'));
	t.false(await knex.schema.hasColumn(tableName, 'foo'));
});

test.serial('MSSQL: userModifiedSql with a forbidden construct is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_umbad_${faker.string.alphanumeric(6).toLowerCase()}`;

	nextProposal = {
		forwardSql: `CREATE TABLE [${tableName}] (id INT IDENTITY(1,1) PRIMARY KEY)`,
		rollbackSql: `DROP TABLE [${tableName}]`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'valid ai proposal',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create table' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: `TRUNCATE TABLE [${tableName}]` });
	t.is(approveResp.status, 400);

	const getResp = await request(app.getHttpServer()).get(`/table-schema/change/${changeId}`).set('Cookie', token);
	t.is(JSON.parse(getResp.text).status, SchemaChangeStatusEnum.PENDING);

	const knex = mssqlKnex();
	t.false(await knex.schema.hasTable(tableName));
});

test.serial('MSSQL: ALTER COLUMN widens NVARCHAR(32) → NVARCHAR(MAX) while preserving row data', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_alt_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	const knex = mssqlKnex();
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
		table.string('name', 32);
	});
	await knex(tableName).insert([{ name: 'alice' }, { name: 'bob' }, { name: 'carol' }]);

	nextProposal = {
		forwardSql: `ALTER TABLE [${tableName}] ALTER COLUMN [name] NVARCHAR(MAX)`,
		rollbackSql: `ALTER TABLE [${tableName}] ALTER COLUMN [name] NVARCHAR(32)`,
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

	const typeRow = await knex.raw(
		`SELECT character_maximum_length FROM information_schema.columns WHERE table_name = ? AND column_name = 'name'`,
		[tableName],
	);
	t.is(Number((typeRow as any)[0].character_maximum_length), -1);

	const rows = (await knex(tableName).select('name').orderBy('id')) as Array<{ name: string }>;
	t.deepEqual(
		rows.map((r) => r.name),
		['alice', 'bob', 'carol'],
	);
});
