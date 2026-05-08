/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AICoreService } from '../../../src/ai-core/services/ai-core.service.js';
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
let nextProposals: ProposedChange[] | null = null;

function resolveProposals(): ProposedChange[] {
	if (nextProposals && nextProposals.length > 0) return nextProposals;
	if (nextProposal) return [nextProposal];
	throw new Error('Test must set nextProposal or nextProposals before invoking AI.');
}

function createProposalStream(proposals: ProposedChange[]) {
	return {
		*[Symbol.asyncIterator]() {
			yield {
				type: 'tool_call',
				toolCall: {
					id: faker.string.uuid(),
					name: 'proposeSchemaChange',
					arguments: { proposals },
				},
				responseId: faker.string.uuid(),
			};
		},
	};
}

const mockAICoreService = {
	streamChatWithToolsAndProvider: async () => createProposalStream(resolveProposals()),
	complete: async () => 'Mocked completion',
	chat: async () => ({ content: 'Mocked chat', responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: 'Mocked tools', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => createProposalStream(resolveProposals()),
	chatWithToolsAndProvider: async () => ({ content: 'Mocked', responseId: faker.string.uuid() }),
	streamChatWithProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	completeWithProvider: async () => 'Mocked',
	chatWithProvider: async () => ({ content: 'Mocked', responseId: faker.string.uuid() }),
	continueAfterToolCall: async () => ({ content: 'Mocked', responseId: faker.string.uuid() }),
	continueStreamingAfterToolCall: async () => createProposalStream(resolveProposals()),
	getDefaultProvider: () => 'bedrock',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

test.beforeEach(() => {
	nextProposal = null;
	nextProposals = null;
});

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
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		await dropTestTables(testTables, connectionToTestDB);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string): Promise<string> {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
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

test.serial('generate → approve creates the table in the target DB', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_t_${faker.string.alphanumeric(8).toLowerCase()}`;
	testTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY, name TEXT)`,
		rollbackSql: `DROP TABLE "${tableName}"`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: `Create ${tableName}`,
		reasoning: 'User asked for a new table.',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.send({ userPrompt: `create a ${tableName} table with id and name` });
	t.is(generateResp.status, 201);
	const batch = JSON.parse(generateResp.text);
	t.truthy(batch.batchId);
	t.is(batch.changes.length, 1);
	const change = batch.changes[0];
	t.is(change.status, SchemaChangeStatusEnum.PENDING);
	t.is(change.targetTableName, tableName);
	t.is(change.batchId, batch.batchId);
	t.is(change.orderInBatch, 0);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.send({});
	t.is(approveResp.status, 200);
	const applied = JSON.parse(approveResp.text);
	t.is(applied.status, SchemaChangeStatusEnum.APPLIED);
	t.truthy(applied.appliedAt);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.true(await knex.schema.hasTable(tableName));
});

test.serial('generate → approve → rollback removes the table and creates linked audit row', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_t_${faker.string.alphanumeric(8).toLowerCase()}`;
	testTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY)`,
		rollbackSql: `DROP TABLE "${tableName}"`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: `Create ${tableName}`,
		reasoning: 'Rollback test.',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create table' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	await request(app.getHttpServer()).post(`/table-schema/change/${changeId}/approve`).set('Cookie', token).send({});

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send({});
	t.is(rollbackResp.status, 200);
	const rolledBack = JSON.parse(rollbackResp.text);
	t.is(rolledBack.status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.truthy(rolledBack.rolledBackAt);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.false(await knex.schema.hasTable(tableName));

	const listResp = await request(app.getHttpServer()).get(`/table-schema/${connectionId}/changes`).set('Cookie', token);
	t.is(listResp.status, 200);
	const list = JSON.parse(listResp.text);
	const rollbackAuditRow = list.data.find(
		(c: any) => c.changeType === SchemaChangeTypeEnum.ROLLBACK && c.previousChangeId === changeId,
	);
	t.truthy(rollbackAuditRow, 'Expected a linked rollback audit row');
});

test.serial('generate → reject leaves DB untouched', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_t_${faker.string.alphanumeric(8).toLowerCase()}`;

	nextProposal = {
		forwardSql: `CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY)`,
		rollbackSql: `DROP TABLE "${tableName}"`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'reject test',
		reasoning: 'reject test',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'will reject' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const rejectResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/reject`)
		.set('Cookie', token)
		.send();
	t.is(rejectResp.status, 200);
	t.is(JSON.parse(rejectResp.text).status, SchemaChangeStatusEnum.REJECTED);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.false(await knex.schema.hasTable(tableName));
});

test.serial('approve with invalid SQL marks FAILED and attempts auto-rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_bad_${faker.string.alphanumeric(6).toLowerCase()}`;

	nextProposal = {
		forwardSql: `CREATE TABLE "${tableName}" (id INVALIDTYPE)`,
		rollbackSql: `DROP TABLE IF EXISTS "${tableName}"`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'invalid',
		reasoning: 'will fail',
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

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.false(await knex.schema.hasTable(tableName));
});

test.serial('rollback of PENDING change is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_pend_${faker.string.alphanumeric(6).toLowerCase()}`;

	nextProposal = {
		forwardSql: `CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY)`,
		rollbackSql: `DROP TABLE "${tableName}"`,
		changeType: SchemaChangeTypeEnum.CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'pending rollback test',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'pending' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 409);
});

test.serial('destructive change requires confirmedDestructive=true', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const seedTableName = `ra_seed_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(seedTableName);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	await knex.schema.createTable(seedTableName, (table) => {
		table.increments();
	});

	nextProposal = {
		forwardSql: `DROP TABLE "${seedTableName}"`,
		rollbackSql: `CREATE TABLE "${seedTableName}" (id SERIAL PRIMARY KEY)`,
		changeType: SchemaChangeTypeEnum.DROP_TABLE,
		targetTableName: seedTableName,
		isReversible: false,
		summary: 'destructive',
		reasoning: 'user wants to drop',
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

	t.true(await knex.schema.hasTable(seedTableName), 'table must still exist after first attempt');

	const secondApproveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(secondApproveResp.status, 200);
	t.is(JSON.parse(secondApproveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.false(await knex.schema.hasTable(seedTableName));
});

test.serial('ADD COLUMN: approve adds the column; rollback removes it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_addcol_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
	});

	nextProposal = {
		forwardSql: `ALTER TABLE "${tableName}" ADD COLUMN "phone" VARCHAR(255)`,
		rollbackSql: `ALTER TABLE "${tableName}" DROP COLUMN "phone"`,
		changeType: SchemaChangeTypeEnum.ADD_COLUMN,
		targetTableName: tableName,
		isReversible: true,
		summary: 'add phone column',
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
	t.is(JSON.parse(rollbackResp.text).status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.false(await knex.schema.hasColumn(tableName, 'phone'));
});

test.serial('DROP COLUMN: blocked without confirmedDestructive, succeeds with it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_dropcol_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
		table.string('phone', 255);
	});

	nextProposal = {
		forwardSql: `ALTER TABLE "${tableName}" DROP COLUMN "phone"`,
		rollbackSql: `ALTER TABLE "${tableName}" ADD COLUMN "phone" VARCHAR(255)`,
		changeType: SchemaChangeTypeEnum.DROP_COLUMN,
		targetTableName: tableName,
		isReversible: false,
		summary: 'drop phone column',
		reasoning: 'destructive drop',
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

test.serial('userModifiedSql is validated and applied in place of AI SQL', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_um_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	nextProposal = {
		forwardSql: `CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY, foo TEXT)`,
		rollbackSql: `DROP TABLE "${tableName}"`,
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

	const editedSql = `CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY, bar TEXT)`;
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedSql });
	t.is(approveResp.status, 200);
	const applied = JSON.parse(approveResp.text);
	t.is(applied.status, SchemaChangeStatusEnum.APPLIED);
	t.is(applied.userModifiedSql, editedSql);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.true(await knex.schema.hasColumn(tableName, 'bar'));
	t.false(await knex.schema.hasColumn(tableName, 'foo'));
});

test.serial('userModifiedSql with a forbidden construct is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_umbad_${faker.string.alphanumeric(6).toLowerCase()}`;

	nextProposal = {
		forwardSql: `CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY)`,
		rollbackSql: `DROP TABLE "${tableName}"`,
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
		.send({ userModifiedSql: `GRANT ALL ON "${tableName}" TO PUBLIC` });
	t.is(approveResp.status, 400);

	const getResp = await request(app.getHttpServer()).get(`/table-schema/change/${changeId}`).set('Cookie', token);
	t.is(JSON.parse(getResp.text).status, SchemaChangeStatusEnum.PENDING);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.false(await knex.schema.hasTable(tableName));
});

test.serial('ADD INDEX approve creates a named index; rollback drops it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_idx_${faker.string.alphanumeric(6).toLowerCase()}`;
	const indexName = `ix_${tableName}_email`;
	testTables.push(tableName);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
		table.string('email', 255);
	});

	nextProposal = {
		forwardSql: `CREATE INDEX "${indexName}" ON "${tableName}" ("email")`,
		rollbackSql: `DROP INDEX "${indexName}"`,
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

	const afterAdd = await knex.raw(`SELECT COUNT(*)::int AS c FROM pg_indexes WHERE indexname = ?`, [indexName]);
	t.is(Number(afterAdd.rows[0].c), 1);

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);

	const afterRollback = await knex.raw(`SELECT COUNT(*)::int AS c FROM pg_indexes WHERE indexname = ?`, [indexName]);
	t.is(Number(afterRollback.rows[0].c), 0);
});

test.serial('ADD FOREIGN KEY cross-table reference; rollback drops it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const parentName = `ra_par_${faker.string.alphanumeric(6).toLowerCase()}`;
	const childName = `ra_ch_${faker.string.alphanumeric(6).toLowerCase()}`;
	const fkName = `fk_${childName}_parent`;
	testTables.push(parentName, childName);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	await knex.schema.createTable(parentName, (table) => {
		table.increments();
	});
	await knex.schema.createTable(childName, (table) => {
		table.increments();
		table.integer('parent_id').notNullable();
	});

	nextProposal = {
		forwardSql: `ALTER TABLE "${childName}" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("parent_id") REFERENCES "${parentName}" ("id")`,
		rollbackSql: `ALTER TABLE "${childName}" DROP CONSTRAINT "${fkName}"`,
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

	const afterAdd = await knex.raw(`SELECT COUNT(*)::int AS c FROM pg_constraint WHERE conname = ? AND contype = 'f'`, [
		fkName,
	]);
	t.is(Number(afterAdd.rows[0].c), 1);

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);

	const afterRollback = await knex.raw(
		`SELECT COUNT(*)::int AS c FROM pg_constraint WHERE conname = ? AND contype = 'f'`,
		[fkName],
	);
	t.is(Number(afterRollback.rows[0].c), 0);
});

test.serial('ALTER COLUMN widens VARCHAR → TEXT while preserving row data', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = `ra_alt_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(tableName);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	await knex.schema.createTable(tableName, (table) => {
		table.increments();
		table.string('name', 32);
	});
	await knex(tableName).insert([{ name: 'alice' }, { name: 'bob' }, { name: 'carol' }]);

	nextProposal = {
		forwardSql: `ALTER TABLE "${tableName}" ALTER COLUMN "name" TYPE TEXT`,
		rollbackSql: `ALTER TABLE "${tableName}" ALTER COLUMN "name" TYPE VARCHAR(32)`,
		changeType: SchemaChangeTypeEnum.ALTER_COLUMN,
		targetTableName: tableName,
		isReversible: true,
		summary: 'widen name column to text',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'widen name to text' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	const typeRow = await knex.raw(
		`SELECT data_type FROM information_schema.columns WHERE table_name = ? AND column_name = 'name'`,
		[tableName],
	);
	t.is(typeRow.rows[0].data_type, 'text');

	const rows = (await knex(tableName).select('name').orderBy('id')) as Array<{ name: string }>;
	t.deepEqual(
		rows.map((r) => r.name),
		['alice', 'bob', 'carol'],
	);
});

test.serial('multi-table batch: generate creates one batch with N pending changes in dependency order', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const products = `ra_products_${faker.string.alphanumeric(6).toLowerCase()}`;
	const users = `ra_users_${faker.string.alphanumeric(6).toLowerCase()}`;
	const orders = `ra_orders_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(orders, users, products);

	nextProposals = [
		{
			forwardSql: `CREATE TABLE "${products}" (id SERIAL PRIMARY KEY, name TEXT, price NUMERIC)`,
			rollbackSql: `DROP TABLE "${products}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: products,
			isReversible: true,
			summary: 'create products',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${users}" (id SERIAL PRIMARY KEY, email TEXT)`,
			rollbackSql: `DROP TABLE "${users}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: users,
			isReversible: true,
			summary: 'create users',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${orders}" (id SERIAL PRIMARY KEY, user_id INT REFERENCES "${users}"(id), product_id INT REFERENCES "${products}"(id))`,
			rollbackSql: `DROP TABLE "${orders}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: orders,
			isReversible: true,
			summary: 'create orders',
			reasoning: '',
		},
	];

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create tables for products, users and orders' });
	t.is(generateResp.status, 201);
	const batch = JSON.parse(generateResp.text);
	t.truthy(batch.batchId);
	t.is(batch.changes.length, 3);
	t.is(batch.changes[0].targetTableName, products);
	t.is(batch.changes[1].targetTableName, users);
	t.is(batch.changes[2].targetTableName, orders);
	t.deepEqual(
		batch.changes.map((c: any) => c.orderInBatch),
		[0, 1, 2],
	);
	t.true(batch.changes.every((c: any) => c.batchId === batch.batchId));
	t.true(batch.changes.every((c: any) => c.status === SchemaChangeStatusEnum.PENDING));
});

test.serial('multi-table batch: approve applies every change in order', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const products = `ra_b_products_${faker.string.alphanumeric(6).toLowerCase()}`;
	const users = `ra_b_users_${faker.string.alphanumeric(6).toLowerCase()}`;
	const orders = `ra_b_orders_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(orders, users, products);

	nextProposals = [
		{
			forwardSql: `CREATE TABLE "${products}" (id SERIAL PRIMARY KEY)`,
			rollbackSql: `DROP TABLE "${products}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: products,
			isReversible: true,
			summary: 'create products',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${users}" (id SERIAL PRIMARY KEY)`,
			rollbackSql: `DROP TABLE "${users}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: users,
			isReversible: true,
			summary: 'create users',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${orders}" (id SERIAL PRIMARY KEY, user_id INT REFERENCES "${users}"(id), product_id INT REFERENCES "${products}"(id))`,
			rollbackSql: `DROP TABLE "${orders}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: orders,
			isReversible: true,
			summary: 'create orders',
			reasoning: '',
		},
	];

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create tables for products, users and orders' });
	const { batchId } = JSON.parse(generateResp.text);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/batch/${batchId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	const applied = JSON.parse(approveResp.text);
	t.is(applied.changes.length, 3);
	t.true(applied.changes.every((c: any) => c.status === SchemaChangeStatusEnum.APPLIED));
	t.true(applied.changes.every((c: any) => !!c.appliedAt));

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.true(await knex.schema.hasTable(products));
	t.true(await knex.schema.hasTable(users));
	t.true(await knex.schema.hasTable(orders));
});

test.serial('multi-table batch: mid-failure auto-rolls back already-applied items', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const ok1 = `ra_f_ok1_${faker.string.alphanumeric(6).toLowerCase()}`;
	const ok2 = `ra_f_ok2_${faker.string.alphanumeric(6).toLowerCase()}`;
	const bad = `ra_f_bad_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(ok1, ok2, bad);

	nextProposals = [
		{
			forwardSql: `CREATE TABLE "${ok1}" (id SERIAL PRIMARY KEY)`,
			rollbackSql: `DROP TABLE "${ok1}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: ok1,
			isReversible: true,
			summary: 'ok1',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${ok2}" (id SERIAL PRIMARY KEY)`,
			rollbackSql: `DROP TABLE "${ok2}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: ok2,
			isReversible: true,
			summary: 'ok2',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${bad}" (id INVALIDTYPE)`,
			rollbackSql: `DROP TABLE IF EXISTS "${bad}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: bad,
			isReversible: true,
			summary: 'broken',
			reasoning: '',
		},
	];

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'three tables but one fails' });
	const { batchId } = JSON.parse(generateResp.text);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/batch/${batchId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 400);
	t.regex(approveResp.body?.message ?? '', /failed at order 2/);

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.false(await knex.schema.hasTable(ok1));
	t.false(await knex.schema.hasTable(ok2));
	t.false(await knex.schema.hasTable(bad));

	const getResp = await request(app.getHttpServer()).get(`/table-schema/batch/${batchId}`).set('Cookie', token);
	const final = JSON.parse(getResp.text);
	t.is(final.changes[0].status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.is(final.changes[1].status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.is(final.changes[2].status, SchemaChangeStatusEnum.FAILED);
});

test.serial('multi-table batch: reject marks every pending change REJECTED and leaves DB untouched', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const a = `ra_rj_a_${faker.string.alphanumeric(6).toLowerCase()}`;
	const b = `ra_rj_b_${faker.string.alphanumeric(6).toLowerCase()}`;

	nextProposals = [
		{
			forwardSql: `CREATE TABLE "${a}" (id SERIAL PRIMARY KEY)`,
			rollbackSql: `DROP TABLE "${a}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: a,
			isReversible: true,
			summary: 'a',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${b}" (id SERIAL PRIMARY KEY)`,
			rollbackSql: `DROP TABLE "${b}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: b,
			isReversible: true,
			summary: 'b',
			reasoning: '',
		},
	];

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'two tables to reject' });
	const { batchId } = JSON.parse(generateResp.text);

	const rejectResp = await request(app.getHttpServer())
		.post(`/table-schema/batch/${batchId}/reject`)
		.set('Cookie', token)
		.send({});
	t.is(rejectResp.status, 200);
	const rejected = JSON.parse(rejectResp.text);
	t.true(rejected.changes.every((c: any) => c.status === SchemaChangeStatusEnum.REJECTED));

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.false(await knex.schema.hasTable(a));
	t.false(await knex.schema.hasTable(b));
});

test.serial('multi-table batch: rollback removes tables in reverse and creates linked audit rows', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const parent = `ra_rb_par_${faker.string.alphanumeric(6).toLowerCase()}`;
	const child = `ra_rb_ch_${faker.string.alphanumeric(6).toLowerCase()}`;
	testTables.push(child, parent);

	nextProposals = [
		{
			forwardSql: `CREATE TABLE "${parent}" (id SERIAL PRIMARY KEY)`,
			rollbackSql: `DROP TABLE "${parent}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: parent,
			isReversible: true,
			summary: 'parent',
			reasoning: '',
		},
		{
			forwardSql: `CREATE TABLE "${child}" (id SERIAL PRIMARY KEY, parent_id INT REFERENCES "${parent}"(id))`,
			rollbackSql: `DROP TABLE "${child}"`,
			changeType: SchemaChangeTypeEnum.CREATE_TABLE,
			targetTableName: child,
			isReversible: true,
			summary: 'child',
			reasoning: '',
		},
	];

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'parent + child' });
	const { batchId } = JSON.parse(generateResp.text);

	await request(app.getHttpServer()).post(`/table-schema/batch/${batchId}/approve`).set('Cookie', token).send({});

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	t.true(await knex.schema.hasTable(parent));
	t.true(await knex.schema.hasTable(child));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/batch/${batchId}/rollback`)
		.set('Cookie', token)
		.send({});
	t.is(rollbackResp.status, 200);
	const rolled = JSON.parse(rollbackResp.text);
	t.true(rolled.changes.every((c: any) => c.status === SchemaChangeStatusEnum.ROLLED_BACK));

	t.false(await knex.schema.hasTable(child));
	t.false(await knex.schema.hasTable(parent));

	const listResp = await request(app.getHttpServer()).get(`/table-schema/${connectionId}/changes`).set('Cookie', token);
	const list = JSON.parse(listResp.text);
	const auditRows = list.data.filter((c: any) => c.changeType === SchemaChangeTypeEnum.ROLLBACK);
	t.is(auditRows.length, 2);
});
