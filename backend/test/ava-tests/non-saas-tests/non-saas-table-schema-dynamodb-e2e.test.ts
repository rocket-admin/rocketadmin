/* eslint-disable @typescript-eslint/no-unused-vars */
import {
	AttributeDefinition,
	CreateTableCommand,
	DeleteTableCommand,
	DescribeTableCommand,
	DescribeTimeToLiveCommand,
	DynamoDB,
	KeySchemaElement,
} from '@aws-sdk/client-dynamodb';
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

interface DynamoProposedChange {
	forwardOp: string;
	rollbackOp: string;
	changeType: SchemaChangeTypeEnum;
	targetTableName: string;
	isReversible: boolean;
	summary: string;
	reasoning: string;
}

let nextProposal: DynamoProposedChange | null = null;

function createDynamoProposalStream(proposal: DynamoProposedChange) {
	return {
		*[Symbol.asyncIterator]() {
			yield {
				type: 'tool_call',
				toolCall: {
					id: faker.string.uuid(),
					name: 'proposeDynamoDbSchemaChange',
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
		return createDynamoProposalStream(nextProposal);
	},
	complete: async () => 'mocked',
	chat: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => createDynamoProposalStream(nextProposal!),
	chatWithToolsAndProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: 'mocked', responseId: faker.string.uuid() };
		},
	}),
	completeWithProvider: async () => 'mocked',
	chatWithProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueAfterToolCall: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	continueStreamingAfterToolCall: async () => createDynamoProposalStream(nextProposal!),
	getDefaultProvider: () => 'openai',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const createdTables: string[] = [];

function dynamoConnectionParams() {
	return getTestData(mockFactory).dynamoDBConnection;
}

function buildDynamoDbClient(): DynamoDB {
	const params = dynamoConnectionParams();
	return new DynamoDB({
		endpoint: params.host,
		region: 'localhost',
		credentials: {
			accessKeyId: params.username!,
			secretAccessKey: params.password!,
		},
	});
}

async function tableExists(tableName: string): Promise<boolean> {
	const client = buildDynamoDbClient();
	try {
		await client.send(new DescribeTableCommand({ TableName: tableName }));
		return true;
	} catch (err) {
		if ((err as Error).name === 'ResourceNotFoundException') return false;
		throw err;
	} finally {
		client.destroy();
	}
}

async function describeTable(tableName: string) {
	const client = buildDynamoDbClient();
	try {
		const resp = await client.send(new DescribeTableCommand({ TableName: tableName }));
		return resp.Table;
	} finally {
		client.destroy();
	}
}

async function describeTtl(tableName: string) {
	const client = buildDynamoDbClient();
	try {
		const resp = await client.send(new DescribeTimeToLiveCommand({ TableName: tableName }));
		return resp.TimeToLiveDescription;
	} finally {
		client.destroy();
	}
}

async function seedTable(
	tableName: string,
	keySchema: KeySchemaElement[],
	attributeDefinitions: AttributeDefinition[],
): Promise<void> {
	const client = buildDynamoDbClient();
	try {
		await client.send(
			new CreateTableCommand({
				TableName: tableName,
				KeySchema: keySchema,
				AttributeDefinitions: attributeDefinitions,
				BillingMode: 'PAY_PER_REQUEST',
			}),
		);
	} finally {
		client.destroy();
	}
}

async function dropTableIfExists(tableName: string): Promise<void> {
	const client = buildDynamoDbClient();
	try {
		await client.send(new DeleteTableCommand({ TableName: tableName }));
	} catch (err) {
		if ((err as Error).name !== 'ResourceNotFoundException') {
			console.warn(`Could not drop dynamodb table ${tableName}: ${(err as Error).message}`);
		}
	} finally {
		client.destroy();
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
	const connectionToTestDB = dynamoConnectionParams();
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

test.serial('DynamoDB: generate → approve creates a table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_c');
	createdTables.push(tableName);

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createTable',
			tableName,
			attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
			keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
			billingMode: 'PAY_PER_REQUEST',
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteTable', tableName }),
		changeType: SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: `Create ${tableName}`,
		reasoning: 'basic',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: `create table ${tableName}` });
	t.is(generateResp.status, 201);
	const change = JSON.parse(generateResp.text);
	t.is(change.status, SchemaChangeStatusEnum.PENDING);
	t.is(change.changeType, SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE);

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${change.id}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);
	t.is(JSON.parse(approveResp.text).status, SchemaChangeStatusEnum.APPLIED);
	t.true(await tableExists(tableName));
});

test.serial('DynamoDB: createTable → rollback drops the table', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_rb');
	createdTables.push(tableName);

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createTable',
			tableName,
			attributeDefinitions: [{ attributeName: 'id', attributeType: 'N' }],
			keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteTable', tableName }),
		changeType: SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE,
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
	t.true(await tableExists(tableName));

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

test.serial('DynamoDB: deleteTable requires confirmedDestructive', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_drop');
	createdTables.push(tableName);

	await seedTable(tableName, [{ AttributeName: 'id', KeyType: 'HASH' }], [{ AttributeName: 'id', AttributeType: 'S' }]);

	nextProposal = {
		forwardOp: JSON.stringify({ operation: 'deleteTable', tableName }),
		rollbackOp: JSON.stringify({
			operation: 'createTable',
			tableName,
			attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
			keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
			billingMode: 'PAY_PER_REQUEST',
		}),
		changeType: SchemaChangeTypeEnum.DYNAMODB_DROP_TABLE,
		targetTableName: tableName,
		isReversible: false,
		summary: 'drop',
		reasoning: 'destructive',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'drop table' });
	const changeId = JSON.parse(generateResp.text).id;

	const firstApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(firstApprove.status, 400);
	t.is(firstApprove.body?.type, 'destructive_confirmation_required');
	t.true(await tableExists(tableName));

	const secondApprove = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ confirmedDestructive: true });
	t.is(secondApprove.status, 200);
	t.is(JSON.parse(secondApprove.text).status, SchemaChangeStatusEnum.APPLIED);
	t.false(await tableExists(tableName));
});

test.serial('DynamoDB: updateTable adds GSI; rollback removes it', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_gsi');
	createdTables.push(tableName);

	await seedTable(tableName, [{ AttributeName: 'id', KeyType: 'HASH' }], [{ AttributeName: 'id', AttributeType: 'S' }]);

	const indexName = 'gsi_by_email';
	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'updateTable',
			tableName,
			attributeDefinitions: [
				{ attributeName: 'id', attributeType: 'S' },
				{ attributeName: 'email', attributeType: 'S' },
			],
			globalSecondaryIndexUpdates: [
				{
					create: {
						indexName,
						keySchema: [{ attributeName: 'email', keyType: 'HASH' }],
						projection: { projectionType: 'ALL' },
					},
				},
			],
		}),
		rollbackOp: JSON.stringify({
			operation: 'updateTable',
			tableName,
			globalSecondaryIndexUpdates: [{ delete: { indexName } }],
		}),
		changeType: SchemaChangeTypeEnum.DYNAMODB_UPDATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'add email GSI',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'add email GSI' });
	t.is(generateResp.status, 201);
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	let described = await describeTable(tableName);
	t.truthy(described?.GlobalSecondaryIndexes?.find((g) => g.IndexName === indexName));

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);

	described = await describeTable(tableName);
	t.falsy(described?.GlobalSecondaryIndexes?.find((g) => g.IndexName === indexName));
});

test.serial('DynamoDB: updateTimeToLive enables and rolls back', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_ttl');
	createdTables.push(tableName);

	await seedTable(tableName, [{ AttributeName: 'id', KeyType: 'HASH' }], [{ AttributeName: 'id', AttributeType: 'S' }]);

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'updateTimeToLive',
			tableName,
			timeToLiveSpecification: { enabled: true, attributeName: 'expiresAt' },
		}),
		rollbackOp: JSON.stringify({
			operation: 'updateTimeToLive',
			tableName,
			timeToLiveSpecification: { enabled: false, attributeName: 'expiresAt' },
		}),
		changeType: SchemaChangeTypeEnum.DYNAMODB_UPDATE_TTL,
		targetTableName: tableName,
		isReversible: true,
		summary: 'enable TTL on expiresAt',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'enable ttl' });
	const changeId = JSON.parse(generateResp.text).id;

	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({});
	t.is(approveResp.status, 200);

	let ttl = await describeTtl(tableName);
	t.is(ttl?.AttributeName, 'expiresAt');
	t.is(ttl?.TimeToLiveStatus, 'ENABLED');

	const rollbackResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/rollback`)
		.set('Cookie', token)
		.send();
	t.is(rollbackResp.status, 200);

	ttl = await describeTtl(tableName);
	t.not(ttl?.TimeToLiveStatus, 'ENABLED');
});

test.serial('DynamoDB: userModifiedSql JSON op is validated and applied', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_um');
	createdTables.push(tableName);

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createTable',
			tableName,
			attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
			keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteTable', tableName }),
		changeType: SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'original',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create table' });
	const changeId = JSON.parse(generateResp.text).id;

	const editedOp = JSON.stringify({
		operation: 'createTable',
		tableName,
		attributeDefinitions: [
			{ attributeName: 'id', attributeType: 'S' },
			{ attributeName: 'sort', attributeType: 'N' },
		],
		keySchema: [
			{ attributeName: 'id', keyType: 'HASH' },
			{ attributeName: 'sort', keyType: 'RANGE' },
		],
		billingMode: 'PAY_PER_REQUEST',
	});
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedOp });
	t.is(approveResp.status, 200);

	const described = await describeTable(tableName);
	const hashKey = described?.KeySchema?.find((k) => k.KeyType === 'HASH');
	const rangeKey = described?.KeySchema?.find((k) => k.KeyType === 'RANGE');
	t.is(hashKey?.AttributeName, 'id');
	t.is(rangeKey?.AttributeName, 'sort');
});

test.serial('DynamoDB: userModifiedSql with mismatched tableName is rejected', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_umbad');

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createTable',
			tableName,
			attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
			keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteTable', tableName }),
		changeType: SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'ok',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'create' });
	const changeId = JSON.parse(generateResp.text).id;

	const editedOp = JSON.stringify({
		operation: 'createTable',
		tableName: `${tableName}_hijack`,
		attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
		keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
	});
	const approveResp = await request(app.getHttpServer())
		.post(`/table-schema/change/${changeId}/approve`)
		.set('Cookie', token)
		.send({ userModifiedSql: editedOp });
	t.is(approveResp.status, 400);
});

test.serial('DynamoDB: tool/changeType mismatch is rejected at generate', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_mism');

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createTable',
			tableName,
			attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
			keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteTable', tableName }),
		changeType: SchemaChangeTypeEnum.CREATE_TABLE, // deliberate mismatch
		targetTableName: tableName,
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

test.serial('DynamoDB: createTable with missing attribute fails at generate-time validation', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_bad');

	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'createTable',
			tableName,
			attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
			// keySchema references an attribute not declared:
			keySchema: [{ attributeName: 'missing_attr', keyType: 'HASH' }],
		}),
		rollbackOp: JSON.stringify({ operation: 'deleteTable', tableName }),
		changeType: SchemaChangeTypeEnum.DYNAMODB_CREATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'bad',
		reasoning: '',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'broken create' });
	t.is(generateResp.status, 400);
});

test.serial('DynamoDB: runtime failure marks FAILED and attempts auto-rollback', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionId = await createConnection(token);
	const tableName = randomTableName('ra_ddb_fail');
	createdTables.push(tableName);

	await seedTable(tableName, [{ AttributeName: 'id', KeyType: 'HASH' }], [{ AttributeName: 'id', AttributeType: 'S' }]);

	// Try to delete a GSI that doesn't exist — DynamoDB rejects at UpdateTable time.
	nextProposal = {
		forwardOp: JSON.stringify({
			operation: 'updateTable',
			tableName,
			globalSecondaryIndexUpdates: [{ delete: { indexName: 'nonexistent_gsi' } }],
		}),
		rollbackOp: JSON.stringify({
			operation: 'updateTable',
			tableName,
			attributeDefinitions: [
				{ attributeName: 'id', attributeType: 'S' },
				{ attributeName: 'email', attributeType: 'S' },
			],
			globalSecondaryIndexUpdates: [
				{
					create: {
						indexName: 'nonexistent_gsi',
						keySchema: [{ attributeName: 'email', keyType: 'HASH' }],
						projection: { projectionType: 'ALL' },
					},
				},
			],
		}),
		changeType: SchemaChangeTypeEnum.DYNAMODB_UPDATE_TABLE,
		targetTableName: tableName,
		isReversible: true,
		summary: 'delete missing GSI',
		reasoning: 'will fail',
	};

	const generateResp = await request(app.getHttpServer())
		.post(`/table-schema/${connectionId}/generate`)
		.set('Cookie', token)
		.send({ userPrompt: 'delete missing GSI' });
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
