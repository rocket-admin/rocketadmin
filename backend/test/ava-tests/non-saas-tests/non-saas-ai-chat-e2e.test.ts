/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { registerUserAndReturnUserInfo, createInitialTestUser } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { getTestData } from '../../utils/get-test-data.js';
import { createTestPostgresTableWithSchema } from '../../utils/create-test-table.js';
import { dropTestTables } from '../../utils/drop-test-tables.js';
import { AICoreService } from '../../../src/ai-core/index.js';
import { DataSource } from 'typeorm';
import { BaseType } from '../../../src/common/data-injection.tokens.js';
import { UserAiChatEntity } from '../../../src/entities/ai/ai-conversation-history/user-ai-chat/user-ai-chat.entity.js';
import { AiChatMessageEntity } from '../../../src/entities/ai/ai-conversation-history/ai-chat-messages/ai-chat-message.entity.js';
import { MessageRole } from '../../../src/entities/ai/ai-conversation-history/ai-chat-messages/message-role.enum.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;
const testTables: Array<string> = [];

function createMockAIStream(content: string) {
	return {
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content, responseId: faker.string.uuid() };
		},
	};
}

const mockAICoreService = {
	streamChatWithToolsAndProvider: async () => createMockAIStream('This is a mocked AI response for testing.'),
	complete: async () => 'Mocked completion',
	chat: async () => ({ content: 'Mocked chat', responseId: faker.string.uuid() }),
	streamChat: async () => createMockAIStream('Mocked stream'),
	chatWithTools: async () => ({ content: 'Mocked tools', responseId: faker.string.uuid() }),
	streamChatWithTools: async () => createMockAIStream('Mocked tools stream'),
	getDefaultProvider: () => 'openai',
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

test.after(async () => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
		await dropTestTables(testTables, connectionToTestDB);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

currentTest = 'GET /ai/chats';

test.serial(`${currentTest} should return empty list when user has no chats`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);

		const getChatsResponse = await request(app.getHttpServer())
			.get('/ai/chats')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getChatsResponse.status, 200);
		const chats = JSON.parse(getChatsResponse.text);
		t.true(Array.isArray(chats));
		t.is(chats.length, 0);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should return list of chats for user`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userAiChatRepository = dataSource.getRepository(UserAiChatEntity);

		const userResponse = await request(app.getHttpServer())
			.get('/user')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const user = JSON.parse(userResponse.text);

		const testChat = userAiChatRepository.create({
			id: faker.string.uuid(),
			name: 'Test Chat',
			user_id: user.id,
		});
		await userAiChatRepository.save(testChat);

		const getChatsResponse = await request(app.getHttpServer())
			.get('/ai/chats')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getChatsResponse.status, 200);
		const chats = JSON.parse(getChatsResponse.text);
		t.true(Array.isArray(chats));
		t.is(chats.length, 1);
		t.is(chats[0].name, 'Test Chat');
		t.truthy(chats[0].id);
		t.truthy(chats[0].created_at);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should not return chats from other users`, async (t) => {
	try {
		const { token: token1 } = await registerUserAndReturnUserInfo(app);
		const { token: token2 } = await registerUserAndReturnUserInfo(app);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userAiChatRepository = dataSource.getRepository(UserAiChatEntity);

		const user1Response = await request(app.getHttpServer())
			.get('/user')
			.set('Cookie', token1)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const user1 = JSON.parse(user1Response.text);

		const testChat = userAiChatRepository.create({
			id: faker.string.uuid(),
			name: 'User1 Chat',
			user_id: user1.id,
		});
		await userAiChatRepository.save(testChat);

		const getChatsResponse = await request(app.getHttpServer())
			.get('/ai/chats')
			.set('Cookie', token2)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getChatsResponse.status, 200);
		const chats = JSON.parse(getChatsResponse.text);
		t.true(Array.isArray(chats));
		t.is(chats.length, 0);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

currentTest = 'GET /ai/chats/:chatId';

test.serial(`${currentTest} should return chat with messages`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userAiChatRepository = dataSource.getRepository(UserAiChatEntity);
		const aiChatMessageRepository = dataSource.getRepository(AiChatMessageEntity);

		const userResponse = await request(app.getHttpServer())
			.get('/user')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const user = JSON.parse(userResponse.text);

		const testChat = userAiChatRepository.create({
			id: faker.string.uuid(),
			name: 'Chat with Messages',
			user_id: user.id,
		});
		const savedChat = await userAiChatRepository.save(testChat);

		const userMessage = aiChatMessageRepository.create({
			id: faker.string.uuid(),
			message: 'Hello AI',
			role: MessageRole.user,
			ai_chat_id: savedChat.id,
		});
		await aiChatMessageRepository.save(userMessage);

		const aiMessage = aiChatMessageRepository.create({
			id: faker.string.uuid(),
			message: 'Hello Human',
			role: MessageRole.ai,
			ai_chat_id: savedChat.id,
		});
		await aiChatMessageRepository.save(aiMessage);

		const getChatResponse = await request(app.getHttpServer())
			.get(`/ai/chats/${savedChat.id}`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getChatResponse.status, 200);
		const chat = JSON.parse(getChatResponse.text);
		t.is(chat.id, savedChat.id);
		t.is(chat.name, 'Chat with Messages');
		t.true(Array.isArray(chat.messages));
		t.is(chat.messages.length, 2);

		t.is(chat.messages[0].message, 'Hello AI');
		t.is(chat.messages[0].role, MessageRole.user);
		t.is(chat.messages[1].message, 'Hello Human');
		t.is(chat.messages[1].role, MessageRole.ai);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should return 404 for non-existent chat`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);
		const nonExistentId = faker.string.uuid();

		const getChatResponse = await request(app.getHttpServer())
			.get(`/ai/chats/${nonExistentId}`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getChatResponse.status, 404);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should return 404 when accessing another user's chat`, async (t) => {
	try {
		const { token: token1 } = await registerUserAndReturnUserInfo(app);
		const { token: token2 } = await registerUserAndReturnUserInfo(app);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userAiChatRepository = dataSource.getRepository(UserAiChatEntity);

		const user1Response = await request(app.getHttpServer())
			.get('/user')
			.set('Cookie', token1)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const user1 = JSON.parse(user1Response.text);

		const testChat = userAiChatRepository.create({
			id: faker.string.uuid(),
			name: 'User1 Private Chat',
			user_id: user1.id,
		});
		const savedChat = await userAiChatRepository.save(testChat);

		const getChatResponse = await request(app.getHttpServer())
			.get(`/ai/chats/${savedChat.id}`)
			.set('Cookie', token2)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getChatResponse.status, 404);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

currentTest = 'DELETE /ai/chats/:chatId';

test.serial(`${currentTest} should delete chat and all its messages`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userAiChatRepository = dataSource.getRepository(UserAiChatEntity);
		const aiChatMessageRepository = dataSource.getRepository(AiChatMessageEntity);

		const userResponse = await request(app.getHttpServer())
			.get('/user')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const user = JSON.parse(userResponse.text);

		const testChat = userAiChatRepository.create({
			id: faker.string.uuid(),
			name: 'Chat to Delete',
			user_id: user.id,
		});
		const savedChat = await userAiChatRepository.save(testChat);

		const userMessage = aiChatMessageRepository.create({
			id: faker.string.uuid(),
			message: 'Test message',
			role: MessageRole.user,
			ai_chat_id: savedChat.id,
		});
		await aiChatMessageRepository.save(userMessage);

		const deleteChatResponse = await request(app.getHttpServer())
			.delete(`/ai/chats/${savedChat.id}`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(deleteChatResponse.status, 200);
		const result = JSON.parse(deleteChatResponse.text);
		t.is(result.success, true);

		const foundChat = await userAiChatRepository.findOne({ where: { id: savedChat.id } });
		t.is(foundChat, null);

		const foundMessages = await aiChatMessageRepository.find({ where: { ai_chat_id: savedChat.id } });
		t.is(foundMessages.length, 0);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should return 404 for non-existent chat`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);
		const nonExistentId = faker.string.uuid();

		const deleteChatResponse = await request(app.getHttpServer())
			.delete(`/ai/chats/${nonExistentId}`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(deleteChatResponse.status, 404);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should not allow deleting another user's chat`, async (t) => {
	try {
		const { token: token1 } = await registerUserAndReturnUserInfo(app);
		const { token: token2 } = await registerUserAndReturnUserInfo(app);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userAiChatRepository = dataSource.getRepository(UserAiChatEntity);

		const user1Response = await request(app.getHttpServer())
			.get('/user')
			.set('Cookie', token1)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const user1 = JSON.parse(user1Response.text);

		const testChat = userAiChatRepository.create({
			id: faker.string.uuid(),
			name: 'User1 Chat to Protect',
			user_id: user1.id,
		});
		const savedChat = await userAiChatRepository.save(testChat);

		const deleteChatResponse = await request(app.getHttpServer())
			.delete(`/ai/chats/${savedChat.id}`)
			.set('Cookie', token2)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(deleteChatResponse.status, 404);

		const foundChat = await userAiChatRepository.findOne({ where: { id: savedChat.id } });
		t.truthy(foundChat);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

currentTest = 'POST /ai/v4/request/:connectionId';

test.serial(`${currentTest} should create AI request and save conversation history`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
		const { token } = await registerUserAndReturnUserInfo(app);
		const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
		testTables.push(testTableName);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createConnectionResponse.status, 201);
		const connectionRO = JSON.parse(createConnectionResponse.text);

		await request(app.getHttpServer())
			.post(`/connection/properties/${connectionRO.id}`)
			.send({ allow_ai_requests: true })
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const aiRequestResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${connectionRO.id}?tableName=${testTableName}`)
			.send({
				user_message: 'Show me all records',
			})
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(aiRequestResponse.status, 201);

		const threadId = aiRequestResponse.headers['x-ai-thread-id'];
		t.truthy(threadId);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userAiChatRepository = dataSource.getRepository(UserAiChatEntity);
		const aiChatMessageRepository = dataSource.getRepository(AiChatMessageEntity);

		const createdChat = await userAiChatRepository.findOne({ where: { id: threadId } });
		t.truthy(createdChat);

		const messages = await aiChatMessageRepository.find({
			where: { ai_chat_id: threadId },
			order: { created_at: 'ASC' },
		});

		t.is(messages.length, 2);
		t.is(messages[0].role, MessageRole.user);
		t.is(messages[0].message, 'Show me all records');
		t.is(messages[1].role, MessageRole.ai);
		t.truthy(messages[1].message);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should continue existing conversation when ai_thread_id is provided`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
		const { token } = await registerUserAndReturnUserInfo(app);
		const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
		testTables.push(testTableName);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createConnectionResponse.status, 201);
		const connectionRO = JSON.parse(createConnectionResponse.text);

		await request(app.getHttpServer())
			.post(`/connection/properties/${connectionRO.id}`)
			.send({ allow_ai_requests: true })
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const firstResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${connectionRO.id}?tableName=${testTableName}`)
			.send({
				user_message: 'First message',
			})
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(firstResponse.status, 201);
		const threadId = firstResponse.headers['x-ai-thread-id'];
		t.truthy(threadId);

		const secondResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${connectionRO.id}?tableName=${testTableName}&threadId=${threadId}`)
			.send({
				user_message: 'Second message',
			})
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(secondResponse.status, 201);
		t.is(secondResponse.headers['x-ai-thread-id'], threadId);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const aiChatMessageRepository = dataSource.getRepository(AiChatMessageEntity);

		const messages = await aiChatMessageRepository.find({
			where: { ai_chat_id: threadId },
			order: { created_at: 'ASC' },
		});

		t.is(messages.length, 4);
		t.is(messages[0].message, 'First message');
		t.is(messages[0].role, MessageRole.user);
		t.is(messages[1].role, MessageRole.ai);
		t.is(messages[2].message, 'Second message');
		t.is(messages[2].role, MessageRole.user);
		t.is(messages[3].role, MessageRole.ai);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should fail without authentication`, async (t) => {
	try {
		const connectionId = faker.string.uuid();

		const aiRequestResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${connectionId}`)
			.send({
				user_message: 'Test message',
				table_name: 'test_table',
			})
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(aiRequestResponse.status, 401);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should fail when AI requests are not allowed for connection`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
		const { token } = await registerUserAndReturnUserInfo(app);
		const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
		testTables.push(testTableName);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createConnectionResponse.status, 201);
		const connectionRO = JSON.parse(createConnectionResponse.text);

		await request(app.getHttpServer())
			.post(`/connection/properties/${connectionRO.id}`)
			.send({ allow_ai_requests: false })
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const aiRequestResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${connectionRO.id}?tableName=${testTableName}`)
			.send({
				user_message: 'Show me all records',
			})
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(aiRequestResponse.status, 400);
		const response = JSON.parse(aiRequestResponse.text);
		t.is(response.message, Messages.AI_REQUESTS_NOT_ALLOWED);
	} catch (e) {
		console.error(e);
		throw e;
	}
});
