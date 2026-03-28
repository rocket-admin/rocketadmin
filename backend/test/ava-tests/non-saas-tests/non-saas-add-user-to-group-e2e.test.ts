/* eslint-disable @typescript-eslint/no-unused-vars */

import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	createInitialTestUser,
	inviteUserInCompanyAndAcceptInvitation,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let _testUtils: TestUtils;

const mockFactory = new MockFactory();

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	app = moduleFixture.createNestApplication();
	_testUtils = moduleFixture.get<TestUtils>(TestUtils);

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
	await Cacher.clearAllCache();
	await app.close();
});

let currentTest = 'PUT /group/user';

test.serial(`${currentTest} should add user to group and verify user appears in group users list`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: secondUserRegisterInfo.email, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 200);
	const addResult = JSON.parse(addUserResponse.text);
	t.is(addResult.group.users.length, 2);
	t.is(addResult.group.users[1].email, secondUserRegisterInfo.email.toLowerCase());
	t.is(addResult.external_invite, false);

	// Verify user appears in GET /group/users/:groupId
	const getUsersResponse = await request(app.getHttpServer())
		.get(`/group/users/${createGroupRO.id}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getUsersResponse.status, 200);
	const usersInGroup = JSON.parse(getUsersResponse.text);
	t.is(usersInGroup.length, 2);
	const userEmails = usersInGroup.map((u) => u.email);
	t.truthy(userEmails.includes(secondUserRegisterInfo.email.toLowerCase()));
});

test.serial(`${currentTest} should add user with case-insensitive email`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const uppercaseEmail = secondUserRegisterInfo.email.toUpperCase();
	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: uppercaseEmail, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 200);
	const addResult = JSON.parse(addUserResponse.text);
	t.is(addResult.group.users.length, 2);
	t.is(addResult.group.users[1].email, secondUserRegisterInfo.email.toLowerCase());
});

test.serial(`${currentTest} should add multiple users to the same group`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);
	const thirdUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(firstUserToken, undefined, app, undefined);
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const addUser2Response = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: secondUserRegisterInfo.email, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(addUser2Response.status, 200);
	t.is(JSON.parse(addUser2Response.text).group.users.length, 2);

	const addUser3Response = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: thirdUserRegisterInfo.email, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(addUser3Response.status, 200);
	const addUser3Result = JSON.parse(addUser3Response.text);
	t.is(addUser3Result.group.users.length, 3);

	const userIds = addUser3Result.group.users.map((u) => u.id);
	const uniqueIds = new Set(userIds);
	t.is(uniqueIds.size, 3);
});

test.serial(`${currentTest} should throw error when adding user not invited in company`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const randomEmail = faker.internet.email();
	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: randomEmail, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 400);
	const { message } = JSON.parse(addUserResponse.text);
	t.is(message, Messages.USER_NOT_INVITED_IN_COMPANY(randomEmail.toLowerCase()));
});

test.serial(`${currentTest} should throw error when user already added in group`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const requestBody = { email: secondUserRegisterInfo.email, groupId: createGroupRO.id };

	const firstAdd = await request(app.getHttpServer())
		.put('/group/user/')
		.send(requestBody)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(firstAdd.status, 200);

	const secondAdd = await request(app.getHttpServer())
		.put('/group/user/')
		.send(requestBody)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(secondAdd.status, 400);
	const { message } = JSON.parse(secondAdd.text);
	t.is(message, Messages.USER_ALREADY_ADDED);
});

test.serial(`${currentTest} should throw error when groupId is not passed`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);

	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: secondUserRegisterInfo.email, groupId: undefined })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 400);
	const { message } = JSON.parse(addUserResponse.text);
	t.is(message, Messages.GROUP_ID_MISSING);
});

test.serial(`${currentTest} should throw error when email is not passed`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: undefined, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 400);
});

test.serial(`${currentTest} should throw error when groupId is a fake UUID (no permissions)`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);

	const fakeGroupId = faker.string.uuid();
	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: secondUserRegisterInfo.email, groupId: fakeGroupId })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 403);
	const { message } = JSON.parse(addUserResponse.text);
	t.is(message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should not allow non-admin user without group edit permission to add user`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);
	const thirdUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(firstUserToken, undefined, app, undefined);
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	// Add second user to the group (without edit permissions)
	await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: secondUserRegisterInfo.email, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	// Second user (non-admin, no group edit permission) tries to add third user
	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: thirdUserRegisterInfo.email, groupId: createGroupRO.id })
		.set('Cookie', secondUserRegisterInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 403);
	const { message } = JSON.parse(addUserResponse.text);
	t.is(message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should add user to admin group`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);
	const { newConnection } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const getGroupsResponse = await request(app.getHttpServer())
		.get(`/connection/groups/${createConnectionRO.id}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(getGroupsResponse.status, 200);
	const groups = JSON.parse(getGroupsResponse.text);
	const adminGroup = groups.find((g) => g.group.isMain === true);
	t.truthy(adminGroup);
	const adminGroupId = adminGroup.group.id;

	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: secondUserRegisterInfo.email, groupId: adminGroupId })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 200);
	const addResult = JSON.parse(addUserResponse.text);
	t.is(addResult.group.isMain, true);
	t.is(addResult.group.users.length, 2);
	t.is(addResult.group.users[1].email, secondUserRegisterInfo.email.toLowerCase());
});

test.serial(`${currentTest} should return correct response structure`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const secondUserRegisterInfo = await inviteUserInCompanyAndAcceptInvitation(
		firstUserToken,
		undefined,
		app,
		undefined,
	);
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: secondUserRegisterInfo.email, groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 200);
	const responseBody = JSON.parse(addUserResponse.text);

	t.is(Object.hasOwn(responseBody, 'group'), true);
	t.is(Object.hasOwn(responseBody, 'message'), true);
	t.is(Object.hasOwn(responseBody, 'external_invite'), true);
	t.is(responseBody.external_invite, false);

	const { group } = responseBody;
	t.is(Object.hasOwn(group, 'title'), true);
	t.is(Object.hasOwn(group, 'isMain'), true);
	t.is(Object.hasOwn(group, 'users'), true);
	t.is(group.title, newGroup1.title);
	t.is(group.isMain, false);

	t.is(group.users.length, 2);
	for (const user of group.users) {
		t.is(Object.hasOwn(user, 'id'), true);
		t.is(Object.hasOwn(user, 'email'), true);
		t.is(typeof user.id, 'string');
		t.is(typeof user.email, 'string');
	}
});

test.serial(`${currentTest} should throw error with invalid email format`, async (t) => {
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { newConnection, newGroup1 } = getTestData(mockFactory);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${createConnectionRO.id}`)
		.send(newGroup1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const createGroupRO = JSON.parse(createGroupResponse.text);

	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: 'not-a-valid-email', groupId: createGroupRO.id })
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(addUserResponse.status, 400);
});

test.serial(`${currentTest} should throw error without authentication`, async (t) => {
	const addUserResponse = await request(app.getHttpServer())
		.put('/group/user/')
		.send({ email: faker.internet.email(), groupId: faker.string.uuid() })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.truthy(addUserResponse.status === 401 || addUserResponse.status === 403);
});
