/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { MongoClient } from 'mongodb';
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

interface MongoProposedChange {
	forwardOp: string;
	rollbackOp: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	isReversible: boolean;
	summary: string;
	reasoning: string;
}

let nextProposal: MongoProposedChange | null = null;

function createMongoProposalStream(proposal: MongoProposedChange) {
	return {
		*[Symbol.asyncIterator]() {
			yield {
				type: 'tool_call',
				toolCall: {
					id: faker.string.uuid(),
					name: 'proposeMongoSchemaChange',
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
		return createMongoProposalStream(nextProposal);
	},
	complete: async () => 'mocked',
	chat: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => createMongoProposalStream(nextProposal!),
	chatWithToolsAndProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	completeWithProvider: async () => 'mocked',
	chatWithProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueAfterToolCall: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueStreamingAfterToolCall: async () => createMongoProposalStream(nextProposal!),
	getDefaultProvider: () => 'openai',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const createdCollections: string[] = [];

function buildMongoUri(params: any): string {
	let uri =
		`mongodb://${encodeURIComponent(params.username)}:${encodeURIComponent(params.password)}` +
		`@${params.host}:${params.port}/${params.database}`;
	if (params.authSource) {
		uri += `?authSource=${encodeURIComponent(params.authSource)}`;
	}
	return uri;
}

async function withMongoClient<T>(params: any, fn: (db: import('mongodb').Db) => Promise<T>): Promise<T> {
	const client = new MongoClient(buildMongoUri(params));
	await client.connect();
	try {
		return await fn(client.db(params.database));
	} finally {
		await client.close();
	}
}

async function collectionExists(params: any, collectionName: string): Promise<boolean> {
	return withMongoClient(params, async (db) => {
		const list = await db.listCollections({ name: collectionName }).toArray();
		return list.length > 0;
	});
}

async function getIndexes(params: any, collectionName: string): Promise<Array<Record<string, unknown>>> {
	return withMongoClient(params, async (db) => {
		return db.collection(collectionName).listIndexes().toArray();
	});
}

async function getValidator(params: any, collectionName: string): Promise<Record<string, unknown> | null> {
	return withMongoClient(params, async (db) => {
		const list = (await db.listCollections({ name: collectionName }).toArray()) as Array<{
			options?: { validator?: Record<string, unknown> };
		}>;
		if (!list.length) return null;
		return list[0].options?.validator ?? null;
	});
}

async function seedCollection(
	params: any,
	collectionName: string,
	docs: Array<Record<string, unknown>>,
): Promise<void> {
	await withMongoClient(params, async (db) => {
		try {
			await db.createCollection(collectionName);
		} catch (err) {
			if (
				!String((err as Error).message)
					.toLowerCase()
					.includes('already exists')
			) {
				throw err;
			}
		}
		if (docs.length > 0) {
			await db.collection(collectionName).insertMany(docs);
		}
	});
}

async function dropCollectionIfExists(params: any, collectionName: string): Promise<void> {
	await withMongoClient(params, async (db) => {
		try {
			await db.collection(collectionName).drop();
		} catch {
			/* ignore missing collection */
		}
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
		const mongoParams = getTestData(mockFactory).mongoDbConnection;
		for (const name of createdCollections) {
			await dropCollectionIfExists(mongoParams, name);
		}
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string, overrides: Partial<Record<string, unknown>> = {}): Promise<string> {
	const connectionToTestDB = { ...getTestData(mockFactory).mongoDbConnection, ...overrides };
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

function randomCollectionName(prefix: string): string {
	return `${prefix}_${faker.string.alphanumeric(6).toLowerCase()}`;
}

test.serial('MongoDB: createCollection → drop via rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_mc');
	createdCollections.push(collectionName);

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'createCollection', collectionName }),
		rollbackOp: JSON.stringify({ operation: 'dropCollection', collectionName }),
		changeType: SchemaChangeTypeEnum.MONGO_CREATE_COLLECTION,
		targetTableName: collectionName,
		isReversible: true,
		summary: `Create ${collectionName}`,
		reasoning: 'test',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: `create collection ${collectionName}` });
	t.is(generateResp.status, 201);
	const change = JSON.parse(generateResp.text);
	t.is(change.status, SchemaChangeStatusEnum.PENDING);
	t.is(change.changeType, SchemaChangeTypeEnum.MONGO_CREATE_COLLECTION);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.true(await collectionExists(getTestData(mockFactory).mongoDbConnection, collectionName));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);
	t.is(JSON.parse(rollbackResp.text).status, SchemaChangeStatusEnum.ROLLED_BACK);
	t.false(await collectionExists(getTestData(mockFactory).mongoDbConnection, collectionName));
});

test.serial('MongoDB: dropCollection requires confirmedDestructive', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_md');
	createdCollections.push(collectionName);

	const mongoParams = getTestData(mockFactory).mongoDbConnection;
	await seedCollection(mongoParams, collectionName, [{ x: 1 }, { x: 2 }]);

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'dropCollection', collectionName }),
		rollbackOp: JSON.stringify({ operation: 'createCollection', collectionName }),
		changeType: SchemaChangeTypeEnum.MONGO_DROP_COLLECTION,
		targetTableName: collectionName,
		isReversible: false,
		summary: 'drop',
		reasoning: 'destructive',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'drop collection' });
	const changeId = JSON.parse(generateResp.text).id;

	const firstApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(firstApprove.status, 400);
	t.is(firstApprove.body?.type, 'destructive_confirmation_required');
	t.true(await collectionExists(mongoParams, collectionName));

	const secondApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(secondApprove.status, 200);
	t.is(JSON.parse(secondApprove.text).status, SchemaChangeStatusEnum.APPLIED);
	t.false(await collectionExists(mongoParams, collectionName));
});

test.serial('MongoDB: createIndex → rollback drops the index', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_mi');
	createdCollections.push(collectionName);

	const mongoParams = getTestData(mockFactory).mongoDbConnection;
	await seedCollection(mongoParams, collectionName, [{ email: 'a@a.test' }, { email: 'b@b.test' }]);

	const indexName = 'idx_email_asc';
	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createIndex',
			collectionName,
			indexName,
			indexSpec: { email: 1 },
			indexOptions: { unique: true, name: indexName },
		}),
		rollbackOp: JSON.stringify({ operation: 'dropIndex', collectionName, indexName }),
		changeType: SchemaChangeTypeEnum.MONGO_CREATE_INDEX,
		targetTableName: collectionName,
		isReversible: true,
		summary: 'add unique email index',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'add unique email index' });
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	let indexes = await getIndexes(mongoParams, collectionName);
	t.truthy(indexes.find((idx) => idx.name === indexName));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);

	indexes = await getIndexes(mongoParams, collectionName);
	t.falsy(indexes.find((idx) => idx.name === indexName));
});

test.serial('MongoDB: setValidator applies a JSON Schema', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	// MongoDB refuses validators on the admin/config databases, so this test uses
	// an isolated user-space database. authSource stays on admin where the root
	// user is defined, per standard MongoDB practice.
	const isolatedDb = `ra_test_${faker.string.alphanumeric(6).toLowerCase()}`;
	const connectionId = await createConnection(token, { database: isolatedDb, authSource: 'admin' });
	const collectionName = randomCollectionName('ra_mv');

	const mongoParams = { ...getTestData(mockFactory).mongoDbConnection, database: isolatedDb, authSource: 'admin' };
	await seedCollection(mongoParams, collectionName, []);

	const validatorSchema = {
		$jsonSchema: {
			bsonType: 'object',
			required: ['email'],
			properties: {
				email: { bsonType: 'string' },
			},
		},
	};

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'setValidator',
			collectionName,
			validatorSchema,
			validationLevel: 'strict',
			validationAction: 'error',
		}),
		rollbackOp: JSON.stringify({
			operation: 'setValidator',
			collectionName,
			validatorSchema: null,
		}),
		changeType: SchemaChangeTypeEnum.MONGO_SET_VALIDATOR,
		targetTableName: collectionName,
		isReversible: true,
		summary: 'require email',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'require email' });
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	if (approveResp.status !== 200) {
		console.error('setValidator approve failed:', approveResp.status, approveResp.text);
	}
	t.is(approveResp.status, 200);

	const validator = await getValidator(mongoParams, collectionName);
	t.truthy(validator?.$jsonSchema);
});

test.serial('MongoDB: validator with $where is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_mvbad');

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'setValidator',
			collectionName,
			validatorSchema: { $where: 'this.x === 1' },
		}),
		rollbackOp: JSON.stringify({ operation: 'setValidator', collectionName, validatorSchema: null }),
		changeType: SchemaChangeTypeEnum.MONGO_SET_VALIDATOR,
		targetTableName: collectionName,
		isReversible: true,
		summary: 'bad validator',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'bad validator' });
	t.is(generateResp.status, 400);
});

test.serial('MongoDB: userModifiedSql JSON op is validated and applied', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_mum');
	createdCollections.push(collectionName);

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'createCollection', collectionName }),
		rollbackOp: JSON.stringify({ operation: 'dropCollection', collectionName }),
		changeType: SchemaChangeTypeEnum.MONGO_CREATE_COLLECTION,
		targetTableName: collectionName,
		isReversible: true,
		summary: 'original',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create collection' });
	const changeId = JSON.parse(generateResp.text).id;

	const editedOp = JSON.stringify({ operation: 'createCollection', collectionName });
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedOp });
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).userModifiedSql, editedOp);
	t.true(await collectionExists(getTestData(mockFactory).mongoDbConnection, collectionName));
});

test.serial('MongoDB: userModifiedSql with forbidden $where is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_mumbad');

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'setValidator',
			collectionName,
			validatorSchema: { $jsonSchema: { bsonType: 'object' } },
		}),
		rollbackOp: JSON.stringify({ operation: 'setValidator', collectionName, validatorSchema: null }),
		changeType: SchemaChangeTypeEnum.MONGO_SET_VALIDATOR,
		targetTableName: collectionName,
		isReversible: true,
		summary: 'ok',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'require shape' });
	const changeId = JSON.parse(generateResp.text).id;

	const editedOp = JSON.stringify({
		operation: 'setValidator',
		collectionName,
		validatorSchema: { $where: 'this.x === 1' },
	});
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedOp });
	t.is(approveResp.status, 400);
});

test.serial('MongoDB: invalid op marks FAILED and attempts auto-rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_mfail');
	createdCollections.push(collectionName);

	// Ask the server to dropIndex "nonexistent" on a fresh collection — the initial
	// createCollection-is-not-done-yet path is fine; we need a structurally valid op
	// that the DB itself will reject. listIndexes on a missing collection throws.
	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'dropIndex', collectionName, indexName: 'nonexistent_idx' }),
		rollbackOp: JSON.stringify({
			operation: 'createIndex',
			collectionName,
			indexName: 'nonexistent_idx',
			indexSpec: { x: 1 },
			indexOptions: { name: 'nonexistent_idx' },
		}),
		changeType: SchemaChangeTypeEnum.MONGO_DROP_INDEX,
		targetTableName: collectionName,
		isReversible: true,
		summary: 'drop missing index',
		reasoning: 'will fail at runtime',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'drop nonexistent index' });
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
});

test.serial('MongoDB: tool/changeType mismatch is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const collectionName = randomCollectionName('ra_mmism');

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'createCollection', collectionName }),
		rollbackOp: JSON.stringify({ operation: 'dropCollection', collectionName }),
		changeType: SchemaChangeTypeEnum.CREATE_TABLE, // deliberate mismatch
		targetTableName: collectionName,
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
