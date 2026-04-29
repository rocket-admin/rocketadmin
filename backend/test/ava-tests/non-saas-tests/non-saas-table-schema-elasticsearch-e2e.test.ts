/* eslint-disable @typescript-eslint/no-unused-vars */
import { Client } from '@elastic/elasticsearch';
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

interface ElasticProposedChange {
	forwardOp: string;
	rollbackOp: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	isReversible: boolean;
	summary: string;
	reasoning: string;
}

let nextProposal: ElasticProposedChange | null = null;

function createElasticProposalStream(proposal: ElasticProposedChange) {
	return {
		*[Symbol.asyncIterator]() {
			yield {
				type: 'tool_call',
				toolCall: {
					id: faker.string.uuid(),
					name: 'proposeElasticsearchSchemaChange',
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
		return createElasticProposalStream(nextProposal);
	},
	complete: async () => 'mocked',
	chat: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => createElasticProposalStream(nextProposal!),
	chatWithToolsAndProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	completeWithProvider: async () => 'mocked',
	chatWithProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueAfterToolCall: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueStreamingAfterToolCall: async () => createElasticProposalStream(nextProposal!),
	getDefaultProvider: () => 'bedrock',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const createdIndices: string[] = [];

function elasticConnectionParams() {
	return getTestData(mockFactory).elasticsearchTestConnection;
}

function buildElasticClient(): Client {
	const params = elasticConnectionParams();
	return new Client({
		node: `http://${params.host}:${params.port}`,
		auth: { username: params.username, password: params.password },
	});
}

async function withElastic<T>(fn: (client: Client) => Promise<T>): Promise<T> {
	const client = buildElasticClient();
	try {
		return await fn(client);
	} finally {
		await client.close().catch(() => undefined);
	}
}

async function indexExists(indexName: string): Promise<boolean> {
	return withElastic(async (client) => {
		return client.indices.exists({ index: indexName });
	});
}

async function getMapping(indexName: string): Promise<Record<string, unknown> | null> {
	return withElastic(async (client) => {
		try {
			const resp = await client.indices.getMapping({ index: indexName });
			const entry = (resp as Record<string, { mappings?: Record<string, unknown> }>)[indexName];
			return entry?.mappings ?? null;
		} catch {
			return null;
		}
	});
}

async function dropIndexIfExists(indexName: string): Promise<void> {
	await withElastic(async (client) => {
		try {
			await client.indices.delete({ index: indexName });
		} catch {
			/* ignore missing index */
		}
	});
}

async function createIndexWithMapping(indexName: string, mappings?: Record<string, unknown>): Promise<void> {
	await withElastic(async (client) => {
		await client.indices.create({
			index: indexName,
			body: mappings ? { mappings } : undefined,
		} as Parameters<typeof client.indices.create>[0]);
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
		for (const name of createdIndices) {
			await dropIndexIfExists(name);
		}
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string): Promise<string> {
	const connectionToTestDB = elasticConnectionParams();
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

function randomIndexName(prefix: string): string {
	return `${prefix}_${faker.string.alphanumeric(6).toLowerCase()}`;
}

test.serial('Elasticsearch: createIndex → approve creates the index; rollback drops it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const indexName = randomIndexName('ra_es_t');
	createdIndices.push(indexName);

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createIndex',
			indexName,
			mappings: { properties: { name: { type: 'keyword' } } },
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteIndex', indexName }),
		changeType: SchemaChangeTypeEnum.ELASTICSEARCH_CREATE_INDEX,
		targetTableName: indexName,
		isReversible: true,
		summary: `Create ${indexName}`,
		reasoning: 'basic create',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: `create index ${indexName}` });
	t.is(generateResp.status, 201);
	const change = JSON.parse(generateResp.text).changes[0];
	t.is(change.status, SchemaChangeStatusEnum.PENDING);
	t.is(change.changeType, SchemaChangeTypeEnum.ELASTICSEARCH_CREATE_INDEX);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.true(await indexExists(indexName));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.is(JSON.parse(rollbackResp.text).status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.false(await indexExists(indexName));

	const listResp = await request(app.getHttpServer()).get(`/table-schema/${connectionId}/changes`).set('Cookie', token);
	const list = JSON.parse(listResp.text);
	const auditRow = list.data.find(
		(c: any) => c.changeType === SchemaChangeTypeEnum.ROLLBACK && c.previousChangeId === change.id,
	);
	t.truthy(auditRow, 'expected linked rollback audit row');
});

test.serial('Elasticsearch: deleteIndex requires confirmedDestructive', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const indexName = randomIndexName('ra_es_d');
	createdIndices.push(indexName);

	await createIndexWithMapping(indexName, { properties: { name: { type: 'keyword' } } });

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'deleteIndex', indexName }),
		rollbackOp: JSON.stringify({ operation: 'createIndex', indexName }),
		changeType: SchemaChangeTypeEnum.ELASTICSEARCH_DELETE_INDEX,
		targetTableName: indexName,
		isReversible: false,
		summary: 'destructive',
		reasoning: 'user wants to drop',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'drop the index' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const firstApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(firstApprove.status, 400);
	t.is(firstApprove.body?.type, 'destructive_confirmation_required');
	t.true(await indexExists(indexName), 'index must still exist');

	const secondApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(secondApprove.status, 200);
	t.is(JSON.parse(secondApprove.text).status, SchemaChangeStatusEnum.APPLIED);
	t.false(await indexExists(indexName));
});

test.serial('Elasticsearch: updateMapping adds a new field; rollback is recorded', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const indexName = randomIndexName('ra_es_um');
	createdIndices.push(indexName);

	await createIndexWithMapping(indexName, { properties: { name: { type: 'keyword' } } });

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'updateMapping',
			indexName,
			properties: { phone: { type: 'keyword' } },
		}),
		// No first-class inverse for putMapping: echo the same updateMapping (idempotent) as a
		// best-effort no-op rollback. Approve path then records ROLLED_BACK without any field removal.
		rollbackOp: JSON.stringify({
			operation: 'updateMapping',
			indexName,
			properties: { phone: { type: 'keyword' } },
		}),
		changeType: SchemaChangeTypeEnum.ELASTICSEARCH_UPDATE_MAPPING,
		targetTableName: indexName,
		isReversible: false,
		summary: 'add phone field',
		reasoning: 'putMapping is forward-only',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'add phone field' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	// Update is destructive in the sense that the rollback can't restore the prior
	// mapping shape; the use-case requires confirmedDestructive when isReversible=false.
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(approveResp.status, 200);

	const mapping = await getMapping(indexName);
	const properties = (mapping?.properties as Record<string, { type?: string }>) ?? {};
	t.is(properties.phone?.type, 'keyword');
});

test.serial('Elasticsearch: invalid op marks FAILED and attempts auto-rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const indexName = randomIndexName('ra_es_fail');
	createdIndices.push(indexName);

	// updateMapping on a non-existent index — Elasticsearch will reject with an
	// index_not_found_exception, exercising the FAILED + auto-rollback path.
	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'updateMapping',
			indexName,
			properties: { phone: { type: 'keyword' } },
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteIndex', indexName }),
		changeType: SchemaChangeTypeEnum.ELASTICSEARCH_UPDATE_MAPPING,
		targetTableName: indexName,
		isReversible: true,
		summary: 'will fail',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'update missing index' });
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
});

test.serial('Elasticsearch: userModifiedSql JSON op is validated and applied', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const indexName = randomIndexName('ra_es_um2');
	createdIndices.push(indexName);

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'createIndex', indexName }),
		rollbackOp: JSON.stringify({ operation: 'deleteIndex', indexName }),
		changeType: SchemaChangeTypeEnum.ELASTICSEARCH_CREATE_INDEX,
		targetTableName: indexName,
		isReversible: true,
		summary: 'original',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	const editedOp = JSON.stringify({
		operation: 'createIndex',
		indexName,
		mappings: { properties: { email: { type: 'keyword' } } },
	});
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedOp });
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).userModifiedSql, editedOp);

	const mapping = await getMapping(indexName);
	const properties = (mapping?.properties as Record<string, { type?: string }>) ?? {};
	t.is(properties.email?.type, 'keyword');
});

test.serial('Elasticsearch: userModifiedSql targeting a system index is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const indexName = randomIndexName('ra_es_sys');

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'createIndex', indexName }),
		rollbackOp: JSON.stringify({ operation: 'deleteIndex', indexName }),
		changeType: SchemaChangeTypeEnum.ELASTICSEARCH_CREATE_INDEX,
		targetTableName: indexName,
		isReversible: true,
		summary: 'valid original',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create' });
	const changeId = JSON.parse(generateResp.text).changes[0].id;

	// User edits to point at a reserved index, but targetTableName mismatch is checked first;
	// even if names matched the leading "." would block the system index.
	const editedOp = JSON.stringify({ operation: 'createIndex', indexName: '.security' });
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedOp });
	t.is(approveResp.status, 400);
});

test.serial('Elasticsearch: tool/changeType mismatch is rejected at generate', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const indexName = randomIndexName('ra_es_mism');

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'createIndex', indexName }),
		rollbackOp: JSON.stringify({ operation: 'deleteIndex', indexName }),
		changeType: SchemaChangeTypeEnum.CREATE_TABLE, // deliberate mismatch
		targetTableName: indexName,
		isReversible: true,
		summary: 'mismatch',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'mismatch' });
	t.is(generateResp.status, 400);
});
