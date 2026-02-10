/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AccessLevelEnum } from '../../../src/enums/index.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	inviteUserInCompanyAndAcceptInvitation,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

type RegisterUserData = {
	email: string;
	password: string;
};

test.before(async () => {
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	_testUtils = moduleFixture.get<TestUtils>(TestUtils);

	app = moduleFixture.createNestApplication() as any;
	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			exceptionFactory(validationErrors: ValidationError[] = []) {
				return new ValidationException(validationErrors);
			},
		}),
	);
	await app.init();
	app.getHttpServer().listen(0);
});

test.after(async () => {
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After custom field error: ' + e);
	}
});

function getTestConnectionData() {
	const newConnection = mockFactory.generateCreateConnectionDto();
	const newConnection2 = mockFactory.generateCreateConnectionDto2();
	const newConnectionToTestDB = mockFactory.generateCreateConnectionDtoToTEstDB();
	const updateConnection = mockFactory.generateUpdateConnectionDto();
	const newGroup1 = mockFactory.generateCreateGroupDto1();
	return {
		newConnection,
		newConnection2,
		newConnectionToTestDB,
		updateConnection,
		newGroup1,
	};
}

currentTest = '> GET /connections >';
test.serial(`${currentTest} should return all connections for this user`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const findAllConnectionsResponse = await request(app.getHttpServer())
		.get('/connections')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(findAllConnectionsResponse.status, 200);
	t.is(findAllConnectionsResponse.body.connections.length, 4);

	let createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createConnectionResult.status, 201);

	createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection2)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createConnectionResult.status, 201);

	const findAll = await request(app.getHttpServer())
		.get('/connections')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(findAll.status, 200);

	const result = findAll.body.connections;

	t.is(result.length, 6);
	t.is(Object.hasOwn(result[0], 'connection'), true);
	t.is(Object.hasOwn(result[1], 'accessLevel'), true);
	t.is(result[2].accessLevel, AccessLevelEnum.edit);

	t.is(Object.hasOwn(result[3], 'accessLevel'), true);
	t.is(Object.hasOwn(result[4].connection, 'host'), true);
	t.is(Object.hasOwn(result[3].connection, 'host'), true);
	t.is(typeof result[0].connection.port, 'number');
	t.is(Object.hasOwn(result[2].connection, 'username'), true);
	t.is(Object.hasOwn(result[3].connection, 'database'), true);
	t.is(Object.hasOwn(result[0].connection, 'createdAt'), true);
	t.is(Object.hasOwn(result[1].connection, 'updatedAt'), true);
	t.is(Object.hasOwn(result[2].connection, 'password'), false);
	t.is(Object.hasOwn(result[3].connection, 'groups'), false);
	const oracleConnectionIndex = result.findIndex((e) => e.connection.type === ConnectionTypesEnum.oracledb);
	// eslint-disable-next-line security/detect-object-injection
	t.is(Object.hasOwn(result[oracleConnectionIndex].connection, 'sid'), true);
	t.pass();
});

currentTest = '> GET connection/users/:slug >';
test.serial(`${currentTest} should return all connection users`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createConnectionResponse.status, 201);

	const connectionRO = JSON.parse(createConnectionResponse.text);

	const findAllUsersResponse = await request(app.getHttpServer())
		.get(`/connection/users/${connectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(findAllUsersResponse.status, 200);

	const foundUsersRO = JSON.parse(findAllUsersResponse.text);
	t.is(foundUsersRO.length, 1);

	t.is(foundUsersRO[0].isActive, false);
	t.is(Object.hasOwn(foundUsersRO[0], 'createdAt'), true);
	t.pass();
});

test.serial(`${currentTest} should return all connection users from different groups`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createConnectionResponse.status, 201);

	const connectionRO = JSON.parse(createConnectionResponse.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${connectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(token, undefined, app, undefined);

	const requestBody = {
		email: secondUserRegisterInfo.email,
		groupId: createGroupRO.id,
	};
	const addUserInGroupResponse = await request(app.getHttpServer())
		.put(`/group/user/`)
		.send(requestBody)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserInGroupResponse.status, 200);

	const findAllUsersResponse = await request(app.getHttpServer())
		.get(`/connection/users/${connectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(findAllUsersResponse.status, 200);
	const foundUsersRO = JSON.parse(findAllUsersResponse.text);
	t.is(foundUsersRO.length, 2);

	// t.is(foundUsersRO[0].isActive, false);
	t.is(foundUsersRO[1].isActive, true);
	t.is(Object.hasOwn(foundUsersRO[1], 'email'), true);
	t.is(Object.hasOwn(foundUsersRO[0], 'email'), true);
	t.is(Object.hasOwn(foundUsersRO[0], 'createdAt'), true);
	t.is(Object.hasOwn(foundUsersRO[1], 'createdAt'), true);

	t.pass();
});

test.serial(`${currentTest} should throw an exception, when connection id is incorrect`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createConnectionResponse.status, 201);
	const connectionRO = JSON.parse(createConnectionResponse.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${connectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(token, undefined, app, undefined);

	const requestBody = {
		email: secondUserRegisterInfo.email,
		groupId: createGroupRO.id,
	};

	const addUserInGroupResponse = await request(app.getHttpServer())
		.put(`/group/user/`)
		.send(requestBody)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	t.is(addUserInGroupResponse.status, 200);

	const fakeConnectionId = faker.string.uuid();
	const findAllUsersResponse = await request(app.getHttpServer())
		.get(`/connection/users/${fakeConnectionId}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const findAllUsersRO = JSON.parse(findAllUsersResponse.text);
	t.is(findAllUsersResponse.status, 403);
	t.is(findAllUsersRO.message, Messages.DONT_HAVE_PERMISSIONS);

	t.pass();
});

test(`${currentTest} should return a found connection`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	const findOneResponce = await request(app.getHttpServer())
		.get(`/connection/one/${createConnectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const foundOneRo = JSON.parse(findOneResponce.text);
	console.log('🚀 ~ foundOneRo:', foundOneRo);
	t.is(findOneResponce.status, 200);
	const result = findOneResponce.body.connection;

	t.is(result.title, 'Test Connection');
	t.is(result.type, 'postgres');
	t.is(result.host, 'nestjs_testing');
	t.is(typeof result.port, 'number');
	t.is(result.port, 5432);
	t.is(result.username, 'postgres');
	t.is(result.database, 'nestjs_testing');
	t.is(result.sid, null);
	t.is(Object.hasOwn(result, 'createdAt'), true);
	t.is(Object.hasOwn(result, 'updatedAt'), true);
	t.is(Object.hasOwn(result, 'password'), false);
	t.is(Object.hasOwn(result, 'groups'), false);
	t.is(Object.hasOwn(result, 'author'), false);
	t.is(Object.hasOwn(result, 'id'), true);

	t.pass();
});

test.serial(
	`${currentTest} should return a found connection when user not added into any connection group`,
	async (t) => {
		const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } =
			getTestConnectionData();
		const { token } = await registerUserAndReturnUserInfo(app);
		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createConnectionResponse.status, 201);
		const connectionRO = JSON.parse(createConnectionResponse.text);

		const createGroupResponse = await request(app.getHttpServer())
			.post(`/connection/group/${connectionRO.id}`)
			.send(newGroup1)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createGroupResponse.status, 201);
		const _createGroupRO = JSON.parse(createGroupResponse.text);

		const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(token, undefined, app, undefined);

		const createConnectionRO = JSON.parse(createConnectionResponse.text);

		const findOneResponse = await request(app.getHttpServer())
			.get(`/connection/one/${createConnectionRO.id}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', secondUserRegisterInfo.token)
			.set('Accept', 'application/json');

		const findOneConnectionRO = JSON.parse(findOneResponse.text);
		t.is(findOneResponse.status, 200);

		t.is(Object.hasOwn(findOneConnectionRO.connection, 'id'), true);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'title'), true);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'type'), true);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'host'), false);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'port'), false);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'username'), false);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'database'), true);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'sid'), false);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'password'), false);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'groups'), false);
		t.is(Object.hasOwn(findOneConnectionRO.connection, 'author'), false);
		t.is(findOneConnectionRO.accessLevel, AccessLevelEnum.none);
		t.is(findOneConnectionRO.groupManagement, false);
		t.is(findOneConnectionRO.connectionProperties, null);
		t.pass();
	},
);

test.serial(
	`${currentTest} should throw an exception "id is missing" when connection id not passed in the request`,
	async (t) => {
		const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } =
			getTestConnectionData();
		const { token } = await registerUserAndReturnUserInfo(app);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		createConnectionRO.id = undefined;
		const findOneResponce = await request(app.getHttpServer())
			.get(`/connection/one/${createConnectionRO.id}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');

		t.is(findOneResponce.status, 400);
		const { message } = JSON.parse(findOneResponce.text);
		t.is(message, Messages.UUID_INVALID);

		t.pass();
	},
);

currentTest = 'POST /connection';
test.serial(`${currentTest} should return created connection`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(response.status, 201);
	const result = JSON.parse(response.text);

	t.is(result.title, 'Test Connection');
	t.is(result.type, 'postgres');
	t.is(result.host, 'nestjs_testing');
	t.is(typeof result.port, 'number');
	t.is(result.port, 5432);
	t.is(result.username, 'postgres');
	t.is(result.database, 'nestjs_testing');
	t.is(result.sid, null);
	t.is(Object.hasOwn(result, 'createdAt'), true);
	t.is(Object.hasOwn(result, 'updatedAt'), true);
	t.is(Object.hasOwn(result, 'password'), false);
	t.is(Object.hasOwn(result, 'groups'), true);
	t.is(typeof result.groups, 'object');
	t.is(result.groups.length >= 1, true);

	const index = result.groups
		.map((e) => {
			return e.title;
		})
		.indexOf('Admin');

	t.is(index >= 0, true);

	t.pass();
});

test.serial(`${currentTest} should throw error when create connection without type`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	delete newConnection.type;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const _responseObject = JSON.parse(response.text);
	const { message } = JSON.parse(response.text);
	t.is(response.status, 400);

	t.pass();
});

test.serial(`${currentTest} should throw error when create connection without host`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	delete newConnection.host;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, Messages.HOST_MISSING);

	t.pass();
});

test.serial(`${currentTest} should throw error when create connection without port`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	delete newConnection.port;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, `${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}`);

	t.pass();
});

test.serial(`${currentTest} should throw error when create connection wit port value more than 65535`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	newConnection.port = 65536;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	// t.is(message, ErrorsMessages.VALIDATION_FAILED);

	t.pass();
});

test.serial(`${currentTest} should throw error when create connection wit port value less than 0`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	newConnection.port = -1;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	// t.is(message, ErrorsMessages.VALIDATION_FAILED);
	t.pass();
});

test.serial(`${currentTest} should throw error when create connection without username`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	delete newConnection.username;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, Messages.USERNAME_MISSING);

	t.pass();
});

test.serial(`${currentTest} should throw error when create connection without database`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	delete newConnection.database;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, Messages.DATABASE_MISSING);

	t.pass();
});

test.serial(`${currentTest} should throw error when create connection without password`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	delete newConnection.password;
	const response = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, Messages.PASSWORD_MISSING);
	t.pass();
});

test.serial(
	`${currentTest} should throw error with complex message when create connection without database, type, port`,
	async (t) => {
		const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } =
			getTestConnectionData();
		const { token } = await registerUserAndReturnUserInfo(app);
		delete newConnection.database;
		delete newConnection.type;
		delete newConnection.port;

		const response = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');

		t.is(response.status, 400);
		const { message } = JSON.parse(response.text);
		// t.is(message, ErrorsMessages.VALIDATION_FAILED);

		t.pass();
	},
);

currentTest = 'PUT /connection';
test.serial(`${currentTest} should return updated connection`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	const updateConnectionResponse = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(updateConnectionResponse.status, 200);
	const result = updateConnectionResponse.body.connection;

	t.is(result.title, 'Updated Test Connection');
	t.is(result.type, 'postgres');
	t.is(result.host, 'testing_nestjs');
	t.is(typeof result.port, 'number');
	t.is(result.port, 5432);
	t.is(result.username, 'admin');
	t.is(result.database, 'testing_nestjs');
	t.is(result.sid, null);
	t.is(Object.hasOwn(result, 'createdAt'), true);
	t.is(Object.hasOwn(result, 'updatedAt'), true);
	t.is(Object.hasOwn(result, 'password'), false);
	t.is(Object.hasOwn(result, 'groups'), false);

	t.pass();
});

test.serial(`${currentTest} 'should throw error when update connection without type'`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	delete updateConnection.type;

	const response = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	// t.is(message, ErrorsMessages.VALIDATION_FAILED);

	t.pass();
});

test.serial(`${currentTest} should throw error when update connection without host`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	delete updateConnection.host;

	const response = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, Messages.HOST_MISSING);
	t.pass();
});

test.serial(`${currentTest} should throw error when update connection without port`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	delete updateConnection.port;

	const response = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, `${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}`);

	t.pass();
});

test.serial(`${currentTest} should throw error when update connection wit port value more than 65535`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	updateConnection.port = 65536;

	const response = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	// t.is(message, ErrorsMessages.VALIDATION_FAILED);

	t.pass();
});

test.serial(`${currentTest} should throw error when update connection wit port value less than 0`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	updateConnection.port = -1;

	const response = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	// t.is(message, ErrorsMessages.VALIDATION_FAILED);

	t.pass();
});

test.serial(`${currentTest} should throw error when update connection without username`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	delete updateConnection.username;

	const response = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, Messages.USERNAME_MISSING);

	t.pass();
});

test.serial(`${currentTest} should throw error when update connection without database`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	delete updateConnection.database;

	const response = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}`)
		.send(updateConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(response.status, 400);
	const { message } = JSON.parse(response.text);
	t.is(message, Messages.DATABASE_MISSING);

	t.pass();
});

test.serial(
	`${currentTest} should throw error with complex message when update connection without database, type, port`,
	async (t) => {
		const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } =
			getTestConnectionData();
		const { token } = await registerUserAndReturnUserInfo(app);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);

		delete updateConnection.database;
		delete updateConnection.type;
		delete updateConnection.port;

		const response = await request(app.getHttpServer())
			.put(`/connection/${createConnectionRO.id}`)
			.send(updateConnection)
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');

		t.is(response.status, 400);
		const { message } = JSON.parse(response.text);
		// t.is(message, ErrorsMessages.VALIDATION_FAILED);

		t.pass();
	},
);

currentTest = 'DELETE /connection/:slug';
test.serial(`${currentTest} should return delete result`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);

	const response = await request(app.getHttpServer())
		.put(`/connection/delete/${createConnectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 200);
	const result = response.body;

	//deleted connection not found in database
	const findOneResponce = await request(app.getHttpServer())
		.get(`/connection/one/${createConnectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(findOneResponce.status, 400);

	const { message } = JSON.parse(findOneResponce.text);
	t.is(message, Messages.CONNECTION_NOT_FOUND);

	t.is(Object.hasOwn(result, 'id'), false);
	t.is(result.title, 'Test Connection');
	t.is(result.type, 'postgres');
	t.is(result.host, 'nestjs_testing');
	t.is(typeof result.port, 'number');
	t.is(result.port, 5432);
	t.is(result.username, 'postgres');
	t.is(result.database, 'nestjs_testing');
	t.is(result.sid, null);
	t.is(Object.hasOwn(result, 'createdAt'), true);
	t.is(Object.hasOwn(result, 'updatedAt'), true);
	t.is(Object.hasOwn(result, 'password'), false);
	t.is(Object.hasOwn(result, 'groups'), false);
	t.is(Object.hasOwn(result, 'author'), false);
	t.pass();
});

test.serial(`${currentTest} should throw an exception when connection not found`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);
	createConnectionRO.id = faker.string.uuid();

	const response = await request(app.getHttpServer())
		.put(`/connection/delete/${createConnectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 403);

	const { message } = JSON.parse(response.text);
	t.is(message, Messages.DONT_HAVE_PERMISSIONS);
	t.pass();
});

test.serial(`${currentTest} should throw an exception when connection id not passed in the request`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);
	createConnectionRO.id = '';

	const response = await request(app.getHttpServer())
		.delete(`/connection/${createConnectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 404);

	t.pass();
});

currentTest = 'POST /connection/group/:slug';
test.serial(`${currentTest} should return a created group`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token, email } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(createGroupResponse.status, 201);
	const result = JSON.parse(createGroupResponse.text);

	t.is(result.title, newGroup1.title);
	t.is(Object.hasOwn(result, 'users'), true);
	t.is(typeof result.users, 'object');
	t.is(result.users.length, 1);
	t.is(result.users[0].email, email.toLowerCase());
	t.is(result.users[0].isActive, false);

	t.pass();
});

test.serial(`${currentTest} throw an exception when connectionId not passed in request`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	createConnectionRO.id = '';
	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(createGroupResponse.status, 404);

	t.pass();
});

test.serial(`${currentTest} throw an exception when group title not passed in request`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	delete newGroup1.title;
	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const { message } = JSON.parse(createGroupResponse.text);

	t.is(createGroupResponse.status, 400);
	// t.is(message, ErrorsMessages.VALIDATION_FAILED);

	t.pass();
});

test.serial(`${currentTest} throw an exception when connectionId is incorrect`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	createConnectionRO.id = faker.string.uuid();
	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const { message } = JSON.parse(createGroupResponse.text);

	t.is(createGroupResponse.status, 403);
	t.is(message, Messages.DONT_HAVE_PERMISSIONS);

	t.pass();
});

test(`${currentTest} throw an exception when group name is not unique`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.set('Cookie', token)
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);
	newGroup1.title = 'Admin';
	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const { message } = JSON.parse(createGroupResponse.text);

	t.is(createGroupResponse.status, 400);
	t.is(message, Messages.GROUP_NAME_UNIQUE);

	t.pass();
});

currentTest = 'PUT /connection/group/delete/:slug';
test.serial(`${currentTest} should return connection without deleted group result`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	// create group in connection
	let result = createGroupResponse.body;

	t.is(createGroupResponse.status, 201);

	t.is(Object.hasOwn(result, 'id'), true);
	t.is(result.title, newGroup1.title);

	const createGroupRO = JSON.parse(createGroupResponse.text);

	let response = await request(app.getHttpServer())
		.put(`/connection/group/delete/${createConnectionRO.id}`)
		.send({ groupId: createGroupRO.id })
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	//after deleting group
	result = response.body;

	t.is(response.status, 200);
	t.is(Object.hasOwn(result, 'title'), true);
	t.is(result.title, createGroupRO.title);
	t.is(result.isMain, false);
	// check that group was deleted

	response = await request(app.getHttpServer())
		.get(`/connection/groups/${createConnectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 200);
	result = JSON.parse(response.text);
	t.is(result.length, 1);
	const _groupId = result[0].group.id;

	t.is(Object.hasOwn(result[0].group, 'title'), true);
	t.is(result[0].accessLevel, AccessLevelEnum.edit);

	const index = result
		.map((e) => {
			return e.group.title;
		})
		.indexOf('Admin');

	t.is(index >= 0, true);

	t.pass();
});

test.serial(`${currentTest}`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	t.pass();
});

test.serial(`${currentTest} should throw an exception when connection id is not passed in the request`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	// create group in connection
	const result = createGroupResponse.body;

	t.is(createGroupResponse.status, 201);

	t.is(Object.hasOwn(result, 'id'), true);
	t.is(result.title, newGroup1.title);

	const createGroupRO = JSON.parse(createGroupResponse.text);
	createConnectionRO.id = '';
	const response = await request(app.getHttpServer())
		.put(`/connection/group/delete/${createConnectionRO.id}`)
		.send({ groupId: createGroupRO.id })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(response.status, 404);
	t.pass();
});

test.serial(`${currentTest} should throw an exception when group id is not passed in the request`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	// create group in connection
	const result = createGroupResponse.body;

	t.is(createGroupResponse.status, 201);

	t.is(Object.hasOwn(result, 'id'), true);
	t.is(result.title, newGroup1.title);

	const createGroupRO = JSON.parse(createGroupResponse.text);
	delete createGroupRO.id;
	const response = await request(app.getHttpServer())
		.put(`/connection/group/delete/${createConnectionRO.id}`)
		.send({ groupId: createGroupRO.id })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const { message } = JSON.parse(response.text);
	t.is(response.status, 400);
	t.is(message, Messages.PARAMETER_NAME_MISSING('groupId'));

	t.pass();
});

test.serial(`${currentTest} should throw an exception when group id is incorrect`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	// create group in connection
	const result = createGroupResponse.body;

	t.is(createGroupResponse.status, 201);

	t.is(Object.hasOwn(result, 'id'), true);
	t.is(result.title, newGroup1.title);

	const createGroupRO = JSON.parse(createGroupResponse.text);
	createGroupRO.id = faker.string.uuid();
	const response = await request(app.getHttpServer())
		.put(`/connection/group/delete/${createConnectionRO.id}`)
		.send({ groupId: createGroupRO.id })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const { message } = JSON.parse(response.text);
	t.is(response.status, 400);
	t.is(message, Messages.GROUP_NOT_FOUND);

	t.pass();
});

test.serial(`${currentTest} should throw an exception when connection id is incorrect`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	// create group in connection
	const result = createGroupResponse.body;

	t.is(createGroupResponse.status, 201);

	t.is(Object.hasOwn(result, 'id'), true);
	t.is(result.title, newGroup1.title);

	const createGroupRO = JSON.parse(createGroupResponse.text);
	createConnectionRO.id = faker.string.uuid();
	const response = await request(app.getHttpServer())
		.put(`/connection/group/delete/${createConnectionRO.id}`)
		.send({ groupId: createGroupRO.id })
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const { message } = JSON.parse(response.text);
	t.is(response.status, 403);
	t.is(message, Messages.DONT_HAVE_PERMISSIONS);

	t.pass();
});

test.serial(`${currentTest} should throw an exception when trying delete admin group`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const createConnectionRO = JSON.parse(createConnectionResult.text);

	const response = await request(app.getHttpServer())
		.put(`/connection/group/delete/${createConnectionRO.id}`)
		.send({ groupId: createConnectionRO.groups[0].id })
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const { message } = JSON.parse(response.text);
	t.is(response.status, 403);
	t.is(message, Messages.CANT_DELETE_ADMIN_GROUP);

	t.pass();
});

currentTest = 'PUT /connection/encryption/restore/:slug';
test.serial(`${currentTest} should return restored connection`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const newPgConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
	newPgConnection.masterEncryption = true;

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newPgConnection)
		.set('masterpwd', 'ahalaimahalai')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createConnectionResult.status, 201);

	const createConnectionRO = JSON.parse(createConnectionResult.text);
	const { id, groups } = createConnectionRO;
	const groupId = groups[0].id;
	const restoreConnectionResult = await request(app.getHttpServer())
		.put(`/connection/encryption/restore/${id}`)
		.send(newPgConnection)
		.set('masterpwd', 'hamalaiahalai')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(restoreConnectionResult.status, 200);
	const restoreConnectionResultRO = JSON.parse(restoreConnectionResult.text);
	const { connection } = restoreConnectionResultRO;
	t.is(connection.id, id);

	const response = await request(app.getHttpServer())
		.get(`/connection/groups/${id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	const result = JSON.parse(response.text);
	t.is(response.status, 200);
	const groupIdInRestoredConnection = result[0].group.id;
	t.is(groupIdInRestoredConnection, groupId);

	t.pass();
});

test.serial(
	`${currentTest} should return restored connection. Restored connection should will return list of tables correctly`,
	async (t) => {
		const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } =
			getTestConnectionData();
		const { token } = await registerUserAndReturnUserInfo(app);

		const newPgConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
		newPgConnection.masterEncryption = true;

		const createConnectionResult = await request(app.getHttpServer())
			.post('/connection')
			.send(newPgConnection)
			.set('masterpwd', 'ahalaimahalai')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createConnectionResult.status, 201);

		const createConnectionRO = JSON.parse(createConnectionResult.text);
		const { id, groups } = createConnectionRO;
		const _groupId = groups[0].id;
		const restoreConnectionResult = await request(app.getHttpServer())
			.put(`/connection/encryption/restore/${id}`)
			.send(newPgConnection)
			.set('masterpwd', 'hamalaiahalai')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(restoreConnectionResult.status, 200);
		const restoreConnectionResultRO = JSON.parse(restoreConnectionResult.text);
		const { connection } = restoreConnectionResultRO;
		t.is(connection.id, id);

		const findTablesResponse = await request(app.getHttpServer())
			.get(`/connection/tables/${id}`)
			.set('Content-Type', 'application/json')
			.set('masterpwd', 'hamalaiahalai')
			.set('Cookie', token)
			.set('Accept', 'application/json');

		const tables = JSON.parse(findTablesResponse.text);

		t.is(findTablesResponse.status, 200);
		t.is(tables.length > 0, true);
	},
);

currentTest = 'GET /connection/groups/:slug';
test.serial(`${currentTest} should groups in connection`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(createGroupResponse.status, 201);

	const response = await request(app.getHttpServer())
		.get(`/connection/groups/${createConnectionRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 200);
	const result = JSON.parse(response.text);
	const _groupId = result[0].group.id;

	t.is(Object.hasOwn(result[1].group, 'title'), true);
	t.is(result[0].accessLevel, AccessLevelEnum.edit);

	const index = result
		.map((e) => {
			return e.group.title;
		})
		.indexOf('Admin');

	t.is(index >= 0, true);

	t.pass();
});

test.serial(`${currentTest} should throw an exception when connection id not passed in the request`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(createGroupResponse.status, 201);

	createConnectionRO.id = '';
	const response = await request(app.getHttpServer())
		.get(`/connection/groups/${createConnectionRO.id}`)
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 404);
	t.pass();
});

test.serial(`${currentTest} should throw an exception when connection id is invalid`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(createGroupResponse.status, 201);
	createConnectionRO.id = faker.string.uuid();
	const response = await request(app.getHttpServer())
		.get(`/connection/groups/${createConnectionRO.id}`)
		.send(newConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(response.status, 200);
	const getGroupsRO = JSON.parse(response.text);
	t.is(Array.isArray(getGroupsRO), true);
	t.is(getGroupsRO.length, 0);

	t.pass();
});

currentTest = 'POST /connection/test/';

test.serial(`${currentTest} should test connection and return result`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const testConnectionResponse = await request(app.getHttpServer())
		.post('/connection/test/')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(testConnectionResponse.status, 201);
	const { message } = JSON.parse(testConnectionResponse.text);
	t.is(message, 'Successfully connected');
});

test.serial(
	`${currentTest} should be successfully tested after update and without changing password during update`,
	async (t) => {
		const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		// test connection
		const testConnectionResponse = await request(app.getHttpServer())
			.post('/connection/test/')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(testConnectionResponse.status, 201);
		const { message } = JSON.parse(testConnectionResponse.text);
		t.is(message, 'Successfully connected');

		// create connection

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createConnectionResponse.status, 201);
		const createConnectionRO = JSON.parse(createConnectionResponse.text);

		// test newly created connection

		const testConnectionResponse2 = await request(app.getHttpServer())
			.post('/connection/test/?connectionId=' + createConnectionRO.id)
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(testConnectionResponse2.status, 201);
		const { message: message2 } = JSON.parse(testConnectionResponse2.text);
		t.is(message2, 'Successfully connected');

		// test connection with some changed properties and removed password property

		const connectionToTestDB2 = { ...connectionToTestDB };
		connectionToTestDB2.title = 'Test Connection 2';
		delete connectionToTestDB2.password;

		const testConnectionResponse3 = await request(app.getHttpServer())
			.post('/connection/test/?connectionId=' + createConnectionRO.id)
			.send(connectionToTestDB2)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(testConnectionResponse3.status, 201);
		const { message: message3 } = JSON.parse(testConnectionResponse3.text);
		t.is(message3, 'Successfully connected');

		// encrypt connection with master password

		const connectionToTestDB3 = { ...connectionToTestDB2 };
		delete connectionToTestDB3.password;
		connectionToTestDB3.masterEncryption = true;
		const encryptConnectionResponse = await request(app.getHttpServer())
			.put(`/connection/${createConnectionRO.id}`)
			.send(connectionToTestDB3)
			.set('Cookie', firstUserToken)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(encryptConnectionResponse.status, 200);
		const _encryptConnectionRO = JSON.parse(encryptConnectionResponse.text);

		// test encrypted connection
		const testConnectionResponse4 = await request(app.getHttpServer())
			.post('/connection/test/?connectionId=' + createConnectionRO.id)
			.send(connectionToTestDB2)
			.set('Cookie', firstUserToken)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(testConnectionResponse4.status, 201);
		const { message: message4 } = JSON.parse(testConnectionResponse4.text);
		t.is(message4, 'Successfully connected');
	},
);

currentTest = 'GET /connection/masterpwd/verify/:connectionId';
test.serial(`${currentTest} should return positive result if passed connection master password is valid`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const newPgConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
	newPgConnection.masterEncryption = true;

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newPgConnection)
		.set('masterpwd', 'ahalaimahalai')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createConnectionResult.status, 201);

	const createConnectionRO = JSON.parse(createConnectionResult.text);
	const { id } = createConnectionRO;

	const masterPwdValidationResponse = await request(app.getHttpServer())
		.get(`/connection/masterpwd/verify/${id}`)
		.set('masterpwd', 'ahalaimahalai')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(masterPwdValidationResponse.status, 200);
	const { isValid } = JSON.parse(masterPwdValidationResponse.text);
	t.is(isValid, true);
});

test.serial(`${currentTest} negative result if passed connection master password is invalid`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);

	const newPgConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
	newPgConnection.masterEncryption = true;

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newPgConnection)
		.set('masterpwd', 'ahalaimahalai')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createConnectionResult.status, 201);

	const createConnectionRO = JSON.parse(createConnectionResult.text);
	const { id } = createConnectionRO;

	const masterPwdValidationResponse = await request(app.getHttpServer())
		.get(`/connection/masterpwd/verify/${id}`)
		.set('masterpwd', 'invalidMaterPwd')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(masterPwdValidationResponse.status, 200);
	const { isValid } = JSON.parse(masterPwdValidationResponse.text);
	t.is(isValid, false);
});

currentTest = `PUT /connection/unfreeze/:connectionId`;
test.serial(`${currentTest} should unfreeze connection`, async (t) => {
	const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestConnectionData();
	const { token } = await registerUserAndReturnUserInfo(app);
	const newPgConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();

	const createConnectionResult = await request(app.getHttpServer())
		.post('/connection')
		.send(newPgConnection)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createConnectionResult.status, 201);

	const createConnectionRO = JSON.parse(createConnectionResult.text);
	const { id } = createConnectionRO;

	const unfreezeConnectionResponse = await request(app.getHttpServer())
		.put(`/connection/unfreeze/${id}`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(unfreezeConnectionResponse.status, 200);
	const unfreezeConnectionRO = JSON.parse(unfreezeConnectionResponse.text);
	t.is(unfreezeConnectionRO.success, true);

	const findOneResponce = await request(app.getHttpServer())
		.get(`/connection/one/${id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(findOneResponce.status, 200);
	const result = findOneResponce.body.connection;
	t.is(result.isFrozen, false);
});
