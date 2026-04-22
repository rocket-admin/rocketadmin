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
					arguments: proposal,
				},
				responseId: faker.string.uuid(),
			};
		},
	};
}

const mockAICoreService = {
	streamChatWithToolsAndProvider: async () => {
		if (!nextProposal) {
			throw new Error('Test must set nextProposal before invoking AI.');
		}
		return createProposalStream(nextProposal);
	},
	complete: async () => 'Mocked completion',
	chat: async () => ({ content: 'Mocked chat', responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: 'Mocked tools', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => createProposalStream(nextProposal!),
	chatWithToolsAndProvider: async () => ({ content: 'Mocked', responseId: faker.string.uuid() }),
	streamChatWithProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	completeWithProvider: async () => 'Mocked',
	chatWithProvider: async () => ({ content: 'Mocked', responseId: faker.string.uuid() }),
	continueAfterToolCall: async () => ({ content: 'Mocked', responseId: faker.string.uuid() }),
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
	if (generateResp.status !== 201) {
		console.error('generate failed:', generateResp.status, generateResp.text);
	}
	t.is(generateResp.status, 201);
	const change = JSON.parse(generateResp.text);
	t.is(change.status, SchemaChangeStatusEnum.PENDING);
	t.is(change.targetTableName, tableName);

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
	const changeId = JSON.parse(generateResp.text).id;

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
	const changeId = JSON.parse(generateResp.text).id;

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
	const changeId = JSON.parse(generateResp.text).id;

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
	const changeId = JSON.parse(generateResp.text).id;

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
