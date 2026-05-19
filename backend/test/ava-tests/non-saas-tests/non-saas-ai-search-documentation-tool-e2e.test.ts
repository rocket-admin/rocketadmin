/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import nock from 'nock';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AICoreService } from '../../../src/ai-core/services/ai-core.service.js';
import { ApplicationModule } from '../../../src/app.module.js';
import { BaseType } from '../../../src/common/data-injection.tokens.js';
import { AiChatMessageEntity } from '../../../src/entities/ai/ai-conversation-history/ai-chat-messages/ai-chat-message.entity.js';
import { MessageRole } from '../../../src/entities/ai/ai-conversation-history/ai-chat-messages/message-role.enum.js';
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

const ALGOLIA_ORIGIN = 'https://31P3X3M1EE-dsn.algolia.net';
const ALGOLIA_PATH = '/1/indexes/rocketadmin-docs/query';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const testTables: Array<string> = [];

let iterationCounter = 0;
let capturedSearchQuery: string | null = null;

function buildIterableStream(chunks: Array<Record<string, unknown>>) {
	return {
		async *[Symbol.asyncIterator]() {
			for (const chunk of chunks) {
				yield chunk;
			}
		},
	};
}

const mockAICoreService = {
	streamChatWithToolsAndProvider: async (_provider: unknown, _messages: unknown, tools: Array<unknown> = []) => {
		if (!Array.isArray(tools) || tools.length === 0) {
			return buildIterableStream([{ type: 'text', content: 'Master password help' }]);
		}
		iterationCounter += 1;
		if (iterationCounter === 1) {
			return buildIterableStream([
				{
					type: 'tool_call',
					toolCall: {
						id: 'doc-search-call-1',
						name: 'searchDocumentation',
						arguments: { query: 'how to enable master password' },
					},
				},
			]);
		}
		return buildIterableStream([
			{
				type: 'text',
				content:
					'Based on the docs: enable master password from the connection settings page. See https://docs.rocketadmin.com/Reference/MasterPassword for the full guide.',
			},
		]);
	},
	complete: async () => 'mocked',
	chat: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChat: async () => buildIterableStream([{ type: 'text', content: 'mocked' }]),
	chatWithTools: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => buildIterableStream([{ type: 'text', content: 'mocked' }]),
	chatWithToolsAndProvider: async () => ({ content: 'mocked', responseId: faker.string.uuid() }),
	getDefaultProvider: () => 'bedrock',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

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
		nock.cleanAll();
		nock.enableNetConnect();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

test.beforeEach(() => {
	iterationCounter = 0;
	capturedSearchQuery = null;
	nock.cleanAll();
});

test.serial('searchDocumentation tool: AI tool_call triggers Algolia call and final answer is persisted', async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
	testTables.push(testTableName);

	const algoliaScope = nock(ALGOLIA_ORIGIN)
		.post(ALGOLIA_PATH, (body) => {
			capturedSearchQuery = typeof body.query === 'string' ? body.query : null;
			return true;
		})
		.reply(200, {
			hits: [
				{
					url: 'https://docs.rocketadmin.com/Reference/MasterPassword',
					content: 'Master password protects the connection encryption key.',
					hierarchy: { lvl0: 'Reference', lvl1: 'Master password' },
				},
			],
		});

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json');
	t.is(createConnectionResponse.status, 201);
	const connectionRO = JSON.parse(createConnectionResponse.text);

	await request(app.getHttpServer())
		.post(`/connection/properties/${connectionRO.id}`)
		.send({ allow_ai_requests: true })
		.set('Cookie', token)
		.set('Content-Type', 'application/json');

	const aiResponse = await request(app.getHttpServer())
		.post(`/ai/v4/request/${connectionRO.id}?tableName=${testTableName}`)
		.send({ user_message: 'How do I turn on the master password?' })
		.set('Cookie', token)
		.set('Content-Type', 'application/json');

	t.is(aiResponse.status, 201);
	t.true(algoliaScope.isDone(), 'expected the use case to call the Algolia search endpoint');
	t.is(capturedSearchQuery, 'how to enable master password');

	const threadId = aiResponse.headers['x-ai-thread-id'];
	t.truthy(threadId);

	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const messageRepository = dataSource.getRepository(AiChatMessageEntity);
	const messages = await messageRepository.find({
		where: { ai_chat_id: threadId },
		order: { created_at: 'ASC' },
	});

	t.is(messages.length, 2);
	t.is(messages[0].role, MessageRole.user);
	t.is(messages[0].message, 'How do I turn on the master password?');
	t.is(messages[1].role, MessageRole.ai);
	t.true(messages[1].message.includes('docs.rocketadmin.com/Reference/MasterPassword'));
});

test.serial('searchDocumentation tool: empty query argument is rejected without calling Algolia', async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
	testTables.push(testTableName);

	const algoliaScope = nock(ALGOLIA_ORIGIN).post(ALGOLIA_PATH).reply(200, { hits: [] });

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json');
	const connectionRO = JSON.parse(createConnectionResponse.text);

	await request(app.getHttpServer())
		.post(`/connection/properties/${connectionRO.id}`)
		.send({ allow_ai_requests: true })
		.set('Cookie', token)
		.set('Content-Type', 'application/json');

	const localMock = {
		...mockAICoreService,
		streamChatWithToolsAndProvider: async (_provider: unknown, _messages: unknown, tools: Array<unknown> = []) => {
			if (!Array.isArray(tools) || tools.length === 0) {
				return buildIterableStream([{ type: 'text', content: 'docs?' }]);
			}
			iterationCounter += 1;
			if (iterationCounter === 1) {
				return buildIterableStream([
					{
						type: 'tool_call',
						toolCall: {
							id: 'doc-search-call-2',
							name: 'searchDocumentation',
							arguments: { query: '' },
						},
					},
				]);
			}
			return buildIterableStream([{ type: 'text', content: 'Sorry, I could not search the documentation.' }]);
		},
	};
	const original = mockAICoreService.streamChatWithToolsAndProvider;
	mockAICoreService.streamChatWithToolsAndProvider = localMock.streamChatWithToolsAndProvider;

	try {
		const aiResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${connectionRO.id}?tableName=${testTableName}`)
			.send({ user_message: 'docs?' })
			.set('Cookie', token)
			.set('Content-Type', 'application/json');

		t.is(aiResponse.status, 201);
		t.false(algoliaScope.isDone(), 'Algolia should not have been called when the query is empty');
	} finally {
		mockAICoreService.streamChatWithToolsAndProvider = original;
	}
});
