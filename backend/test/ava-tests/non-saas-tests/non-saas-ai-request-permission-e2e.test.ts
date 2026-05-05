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
import { AccessLevelEnum } from '../../../src/enums/access-level.enum.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestPostgresTableWithSchema } from '../../utils/create-test-table.js';
import { dropTestTables } from '../../utils/drop-test-tables.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	createInitialTestUser,
	inviteUserInCompanyAndAcceptInvitation,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
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
	getDefaultProvider: () => 'bedrock',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

test.before(async () => {
	setSaasEnvVariable();
	process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
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
		delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

interface InvitedUserSetup {
	adminToken: string;
	invitedToken: string;
	invitedEmail: string;
	connectionId: string;
	createdGroupId: string;
	tableName: string;
}

async function setupInvitedUserInCustomGroup(tableAccessLevel: {
	visibility: boolean;
	readonly: boolean;
	add: boolean;
	delete: boolean;
	edit: boolean;
	aiRequest?: boolean;
}): Promise<InvitedUserSetup> {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const adminToken = adminInfo.token;

	const invitedUserInfo = await inviteUserInCompanyAndAcceptInvitation(adminToken, undefined, app, undefined);
	const invitedToken = invitedUserInfo.token;
	const invitedEmail = invitedUserInfo.email;

	const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
	testTables.push(testTableName);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', adminToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	if (createConnectionResponse.status >= 300) {
		throw new Error(`connection creation failed: ${createConnectionResponse.text}`);
	}
	const connectionRO = JSON.parse(createConnectionResponse.text);
	const connectionId = connectionRO.id;

	await request(app.getHttpServer())
		.post(`/connection/properties/${connectionId}`)
		.send({ allow_ai_requests: true })
		.set('Cookie', adminToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const newGroup = mockFactory.generateCreateGroupDto1();
	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${connectionId}`)
		.set('Cookie', adminToken)
		.send(newGroup)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createdGroupId = JSON.parse(createGroupResponse.text).id;

	const permissions = {
		connection: {
			connectionId,
			accessLevel: AccessLevelEnum.readonly,
		},
		group: {
			groupId: createdGroupId,
			accessLevel: AccessLevelEnum.none,
		},
		tables: [
			{
				tableName: testTableName,
				accessLevel: tableAccessLevel,
			},
		],
	};

	await request(app.getHttpServer())
		.put(`/permissions/${createdGroupId}?connectionId=${connectionId}`)
		.send({ permissions })
		.set('Cookie', adminToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	await request(app.getHttpServer())
		.put('/group/user')
		.set('Cookie', adminToken)
		.send({ groupId: createdGroupId, email: invitedEmail })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	return {
		adminToken,
		invitedToken,
		invitedEmail,
		connectionId,
		createdGroupId,
		tableName: testTableName,
	};
}

const currentTest = 'POST /ai/v4/request/:connectionId (table:ai-request permission)';

test.serial(`${currentTest} should allow request when admin (main) group user calls AI`, async (t) => {
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
			.send({ user_message: 'Show me all records' })
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(aiRequestResponse.status, 201);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`${currentTest} should reject request when invited user has table:read but no table:ai-request`,
	async (t) => {
		try {
			const setup = await setupInvitedUserInCustomGroup({
				visibility: true,
				readonly: true,
				add: false,
				delete: false,
				edit: false,
			});

			const aiRequestResponse = await request(app.getHttpServer())
				.post(`/ai/v4/request/${setup.connectionId}?tableName=${setup.tableName}`)
				.send({ user_message: 'Show me all records' })
				.set('Cookie', setup.invitedToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(aiRequestResponse.status, 403);
			const body = JSON.parse(aiRequestResponse.text);
			t.is(body.message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} should reject request when invited user has table:edit but no table:ai-request`,
	async (t) => {
		try {
			const setup = await setupInvitedUserInCustomGroup({
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			});

			const aiRequestResponse = await request(app.getHttpServer())
				.post(`/ai/v4/request/${setup.connectionId}?tableName=${setup.tableName}`)
				.send({ user_message: 'Show me all records' })
				.set('Cookie', setup.invitedToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(aiRequestResponse.status, 403);
			const body = JSON.parse(aiRequestResponse.text);
			t.is(body.message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`${currentTest} should allow request when invited user has table:ai-request granted`, async (t) => {
	try {
		const setup = await setupInvitedUserInCustomGroup({
			visibility: true,
			readonly: true,
			add: false,
			delete: false,
			edit: false,
			aiRequest: true,
		});

		const aiRequestResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${setup.connectionId}?tableName=${setup.tableName}`)
			.send({ user_message: 'Show me all records' })
			.set('Cookie', setup.invitedToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(aiRequestResponse.status, 201);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should reject request when invited user has no table permissions at all`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgresSchema;
		const adminInfo = await registerUserAndReturnUserInfo(app);
		const adminToken = adminInfo.token;
		const invitedUserInfo = await inviteUserInCompanyAndAcceptInvitation(adminToken, undefined, app, undefined);

		const { testTableName } = await createTestPostgresTableWithSchema(connectionToTestDB);
		testTables.push(testTableName);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', adminToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createConnectionResponse.status, 201);
		const connectionRO = JSON.parse(createConnectionResponse.text);

		await request(app.getHttpServer())
			.post(`/connection/properties/${connectionRO.id}`)
			.send({ allow_ai_requests: true })
			.set('Cookie', adminToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const newGroup = mockFactory.generateCreateGroupDto1();
		const createGroupResponse = await request(app.getHttpServer())
			.post(`/connection/group/${connectionRO.id}`)
			.set('Cookie', adminToken)
			.send(newGroup)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createdGroupId = JSON.parse(createGroupResponse.text).id;

		await request(app.getHttpServer())
			.put('/group/user')
			.set('Cookie', adminToken)
			.send({ groupId: createdGroupId, email: invitedUserInfo.email })
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const aiRequestResponse = await request(app.getHttpServer())
			.post(`/ai/v4/request/${connectionRO.id}?tableName=${testTableName}`)
			.send({ user_message: 'Show me all records' })
			.set('Cookie', invitedUserInfo.token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(aiRequestResponse.status, 403);
	} catch (e) {
		console.error(e);
		throw e;
	}
});
