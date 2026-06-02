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
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestPostgresTableWithSchema } from '../../utils/create-test-table.js';
import { dropTestTables } from '../../utils/drop-test-tables.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const testTables: Array<string> = [];

function buildIterableStream(chunks: Array<Record<string, unknown>>) {
	return {
		async *[Symbol.asyncIterator]() {
			for (const chunk of chunks) {
				yield chunk;
			}
		},
	};
}

function buildAIBatchResponse(prompt: string): string {
	const tableNames = [...prompt.matchAll(/^Table: (\S+)/gm)].map((m) => m[1]);
	const tables = tableNames.map((tableName) => ({
		table_name: tableName,
		display_name: tableName.charAt(0).toUpperCase() + tableName.slice(1),
		search_fields: ['name', 'email'],
		readonly_fields: ['id', 'created_at'],
		columns_view: ['id', 'name', 'email', 'created_at'],
		ordering: 'DESC',
		ordering_field: 'created_at',
		identity_column: 'name',
		widgets: [
			{
				field_name: 'id',
				widget_type: 'Readonly',
				widget_params: {},
				name: 'ID',
				description: 'Unique identifier',
			},
			{
				field_name: 'email',
				widget_type: 'String',
				widget_params: { validate: 'isEmail' },
				name: 'Email',
				description: 'Email address',
			},
		],
	}));
	return JSON.stringify({ tables });
}

const mockAICoreService = {
	completeWithProvider: async (_provider: unknown, prompt: string, _config: unknown) => buildAIBatchResponse(prompt),
	complete: async () => 'mocked',
	chat: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	chatWithProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChat: async () => buildIterableStream([{ type: 'text', content: 'mocked' }]),
	streamChatWithProvider: async () => buildIterableStream([{ type: 'text', content: 'mocked' }]),
	chatWithTools: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	chatWithToolsAndProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => buildIterableStream([{ type: 'text', content: 'mocked' }]),
	streamChatWithToolsAndProvider: async () => buildIterableStream([{ type: 'text', content: 'mocked' }]),
	getDefaultProvider: () => 'bedrock',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

function parseNdjsonChunks(body: string): Array<Record<string, unknown>> {
	return body
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line));
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

test.after.always(async () => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
		await dropTestTables(testTables, connectionToTestDB);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

const currentTest = 'GET /ai/v2/setup/:connectionId';

test.serial(`${currentTest} streams human-readable progress and ends with a complete chunk`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
	testTables.push(testTableName);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json');
	t.is(createConnectionResponse.status, 201);
	const connectionRO = JSON.parse(createConnectionResponse.text);

	const setupResponse = await request(app.getHttpServer())
		.get(`/ai/v2/setup/${connectionRO.id}`)
		.set('Cookie', token)
		.buffer(true)
		.parse((res, callback) => {
			let data = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string) => {
				data += chunk;
			});
			res.on('end', () => callback(null, data));
		});

	t.is(setupResponse.status, 200);
	t.regex(String(setupResponse.headers['content-type']), /text\/event-stream/);

	const chunks = parseNdjsonChunks(setupResponse.body as string);
	t.true(chunks.length > 0, 'expected at least one chunk');

	const types = chunks.map((c) => c.type);
	t.true(types.includes('message'), 'expected at least one "message" chunk');
	t.is(types[types.length - 1], 'complete', 'last chunk should be "complete"');

	const messages = chunks.filter((c) => c.type === 'message').map((c) => String(c.text));
	t.true(
		messages.some((m) => m.startsWith('Starting AI scan')),
		'expected an initial "Starting AI scan" message',
	);
	t.true(
		messages.some((m) => m.includes(`table "${testTableName}"`)),
		`expected at least one message mentioning the test table "${testTableName}"`,
	);
	t.true(
		messages.some((m) => m.includes('display_name parameter set to')),
		'expected a per-parameter "display_name parameter set to" message',
	);
	t.true(
		messages.some((m) => /Added \w+ widget for table/.test(m)),
		'expected at least one "Added <widget> widget for table" message',
	);
});

test.serial(`${currentTest} streams a no-new-tables message when settings already exist`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
	// Use a schema unique to this test so concurrently-running test files (which share the
	// same Postgres and the default "test_schema") cannot inject new tables between the two
	// scans below, which would otherwise make the "no new tables" assertion flaky.
	const isolatedSchema = `ai_stream_${faker.string.alphanumeric(10).toLowerCase()}`;
	connectionToTestDB.schema = isolatedSchema;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB, 42, 'Vasia', isolatedSchema);
	testTables.push(testTableName);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json');
	t.is(createConnectionResponse.status, 201);
	const connectionRO = JSON.parse(createConnectionResponse.text);

	const fetchStream = async () =>
		request(app.getHttpServer())
			.get(`/ai/v2/setup/${connectionRO.id}`)
			.set('Cookie', token)
			.buffer(true)
			.parse((res, callback) => {
				let data = '';
				res.setEncoding('utf8');
				res.on('data', (chunk: string) => {
					data += chunk;
				});
				res.on('end', () => callback(null, data));
			});

	await fetchStream();
	const secondResponse = await fetchStream();

	t.is(secondResponse.status, 200);
	const chunks = parseNdjsonChunks(secondResponse.body as string);
	const messages = chunks.filter((c) => c.type === 'message').map((c) => String(c.text));
	t.true(
		messages.some((m) => m.toLowerCase().includes('no new tables')),
		'expected a "No new tables" status message on second invocation',
	);
	t.is(chunks[chunks.length - 1].type, 'complete');
});
