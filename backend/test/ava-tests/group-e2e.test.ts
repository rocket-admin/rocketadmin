import { INestApplication } from '@nestjs/common';
import { TestUtils } from '../utils/test.utils.js';
import { MockFactory } from '../mock.factory.js';
import test from 'ava';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../src/app.module.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter.js';
import { registerUserAndReturnUserInfo } from '../utils/register-user-and-return-user-info.js';
import { getTestData } from '../utils/get-test-data.js';
import request from 'supertest';
import { AccessLevelEnum } from '../../src/enums/index.js';
import { faker } from '@faker-js/faker';
import { Messages } from '../../src/exceptions/text/messages.js';

let app: INestApplication;
let testUtils: TestUtils;
const mockFactory = new MockFactory();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  testUtils = moduleFixture.get<TestUtils>(TestUtils);
  await testUtils.resetDb();
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  app.getHttpServer().listen(0);
});

let currentTest = 'GET /groups';
test(`${currentTest} should return all user groups`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const findAllUserGroups = await request(app.getHttpServer())
      .get(`/connection/groups/${createConnectionRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findAllUserGroups.status, 200);

    const result = JSON.parse(findAllUserGroups.text);
    console.log('-> result', result);

    t.is(result.length, 2);
    t.is(uuidRegex.test(result[0].group.id), true);
    t.is(result[1].group.hasOwnProperty('users'), false);
    t.is(result[0].group.hasOwnProperty('title'), true);
    t.is(result[1].accessLevel, AccessLevelEnum.edit);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'GET /group/users/:slug';
test(`${currentTest} should return all users in current group`, async (t) => {
  try {
    const registeredUserInfo = await registerUserAndReturnUserInfo(app);
    const firstUserToken = registeredUserInfo.token;
    const firstUserEmail = registeredUserInfo.email;

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const findAllUsersInGroup = await request(app.getHttpServer())
      .get(`/group/users/${createGroupRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findAllUsersInGroup.status, 200);
    const result = JSON.parse(findAllUsersInGroup.text);
    t.is(result.length === 1, true);
    t.is(uuidRegex.test(result[0].id), true);
    // t.is(result[0].isActive).toBe(true);
    t.is(result[0].email, firstUserEmail);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when group id is not real`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    createGroupRO.id = faker.datatype.uuid();
    const findAllUsersInGroup = await request(app.getHttpServer())
      .get(`/group/users/${createGroupRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findAllUsersInGroup.status, 400);
    const { message } = JSON.parse(findAllUsersInGroup.text);
    t.is(message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when group id not passed`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    createGroupRO.id = '';
    const findAllUsersInGroup = await request(app.getHttpServer())
      .get(`/group/users/${createGroupRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findAllUsersInGroup.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'PUT /group/user/:slug';
test(`${currentTest} should return a group with new added user`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };
    const findAllUsersInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const result = JSON.parse(findAllUsersInGroup.text).group;
    t.is(findAllUsersInGroup.status, 200);

    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newGroup1.title);
    t.is(result.users.length, 2);
    t.is(typeof result.users[1], 'object');
    t.is(uuidRegex.test(result.users[0].id), true);
    t.is(result.users[1].email, secondUserRegisterInfo.email);
    // t.is(result.users[0].isActive).toBe(true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when groupId not passed in request`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: undefined,
    };
    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 400);
    const { message } = JSON.parse(addUserInGroup.text);
    t.is(message, Messages.GROUP_ID_MISSING);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when user email not passed in request`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const requestBody = {
      email: undefined,
      groupId: createGroupRO.id,
    };
    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 400);
    const { message } = JSON.parse(addUserInGroup.text);
    t.is(message, Messages.USER_EMAIL_MISSING);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when groupId is incorrect`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    createGroupRO.id = faker.datatype.uuid();

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };
    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 400);
    const { message } = JSON.parse(addUserInGroup.text);
    t.is(message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when add a user what been already added in this group`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };
    const addUserInGroup1 = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup1.status, 200);

    const addUserInGroup2 = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(addUserInGroup2.status, 400);
    const { message } = JSON.parse(addUserInGroup2.text);
    t.is(message, Messages.USER_ALREADY_ADDED_BUT_NOT_ACTIVE);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'DELETE /group';

test(`${currentTest} should return an delete result`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const deleteResult = await request(app.getHttpServer())
      .delete(`/group/${createGroupRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const deleteResultRO = JSON.parse(deleteResult.text);
    t.is(deleteResult.status, 200);
    t.is(typeof deleteResult, 'object');
    t.is(deleteResultRO.isMain, false);

    const response = await request(app.getHttpServer())
      .get(`/connection/groups/${createConnectionRO.id}`)
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    const result = JSON.parse(response.text);
    const groupId = result[0].group.id;
    t.is(result.length, 1);
    t.is(uuidRegex.test(groupId), true);
    t.is(result[0].group.title, 'Admin');
    t.is(result[0].accessLevel, AccessLevelEnum.edit);

    const index = result
      .map((e) => {
        return e.group.title;
      })
      .indexOf('Admin');

    t.is(index >= 0, true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should return throw an exception when groupId is incorrect`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    createGroupRO.id = faker.datatype.uuid();
    const deleteResult = await request(app.getHttpServer())
      .delete(`/group/${createGroupRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(deleteResult.status, 400);
    const { message } = JSON.parse(deleteResult.text);
    t.is(message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when groupId is not passed in request`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    createGroupRO.id = '';
    const deleteResult = await request(app.getHttpServer())
      .delete(`/group/${createGroupRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(deleteResult.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'PUT /group/user/delete';
test(`${currentTest} should return a group without deleted user`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);
    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };
    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 200);
    let result = JSON.parse(addUserInGroup.text).group;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newGroup1.title);
    t.is(result.users.length, 2);
    t.is(typeof result.users[1], 'object');
    t.is(uuidRegex.test(result.users[0].id), true);
    t.is(result.users[1].email, secondUserRegisterInfo.email);
    // t.is(result.users[0].isActive).toBe(true);

    const removeUserFromGroup = await request(app.getHttpServer())
      .put(`/group/user/delete/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    result = JSON.parse(removeUserFromGroup.text);

    t.is(typeof result, 'object');
    t.is(result.title, newGroup1.title);
    t.is(uuidRegex.test(result.id), true);
    t.is(result.hasOwnProperty('users'), true);
    t.is(typeof result.users, 'object');
    t.is(result.users.length, 1);
    t.is(uuidRegex.test(result.users[0].id), true);
    // t.is(result.users[0].isActive).toBe(true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error, when group id not passed in request`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };
    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 200);
    const result = JSON.parse(addUserInGroup.text).group;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newGroup1.title);
    t.is(result.users.length, 2);
    t.is(typeof result.users[1], 'object');
    t.is(uuidRegex.test(result.users[0].id), true);
    t.is(result.users[1].email, secondUserRegisterInfo.email);
    // t.is(result.users[0].isActive).toBe(true);

    requestBody.groupId = undefined;
    const removeUserFromGroup = await request(app.getHttpServer())
      .put(`/group/user/delete/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const { message } = JSON.parse(removeUserFromGroup.text);
    t.is(removeUserFromGroup.status, 400);
    t.is(message, Messages.GROUP_ID_MISSING);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error, when email is not passed in request`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };
    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 200);
    const result = JSON.parse(addUserInGroup.text).group;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newGroup1.title);
    t.is(result.users.length, 2);
    t.is(typeof result.users[1], 'object');
    t.is(uuidRegex.test(result.users[0].id), true);
    t.is(result.users[1].email, secondUserRegisterInfo.email);
    // t.is(result.users[0].isActive).toBe(true);

    requestBody.email = undefined;
    const removeUserFromGroup = await request(app.getHttpServer())
      .put(`/group/user/delete/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const { message } = JSON.parse(removeUserFromGroup.text);
    t.is(removeUserFromGroup.status, 400);
    t.is(message, Messages.USER_EMAIL_MISSING);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error, when there is no this email in database`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };

    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 200);

    requestBody.email = faker.internet.email();
    const removeUserFromGroup = await request(app.getHttpServer())
      .put(`/group/user/delete/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const { message } = JSON.parse(removeUserFromGroup.text);
    t.is(removeUserFromGroup.status, 400);
    t.is(message, Messages.USER_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error, when group id is incorrect`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const secondUserRegisterInfo = await registerUserAndReturnUserInfo(app);

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const requestBody = {
      email: secondUserRegisterInfo.email,
      groupId: createGroupRO.id,
    };
    const addUserInGroup = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroup.status, 200);
    const result = JSON.parse(addUserInGroup.text).group;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newGroup1.title);
    t.is(result.users.length, 2);
    t.is(typeof result.users[1], 'object');
    t.is(uuidRegex.test(result.users[0].id), true);
    t.is(result.users[1].email, secondUserRegisterInfo.email);

    requestBody.groupId = faker.datatype.uuid();
    const removeUserFromGroup = await request(app.getHttpServer())
      .put(`/group/user/delete/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const { message } = JSON.parse(removeUserFromGroup.text);
    t.is(removeUserFromGroup.status, 400);
    t.is(message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error, trying delete last user from admin group`, async (t) => {
  try {
    const firstUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const firstUserToken = firstUserRegisterInfo.token;

    const { newConnection, newConnection2, newGroup1 } = getTestData(mockFactory);

    let createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);

    createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createGroupResponse.status, 201);

    const createGroupRO = JSON.parse(createGroupResponse.text);
    const groupId = createConnectionRO.groups[0].id;
    const requestBody = {
      email: firstUserRegisterInfo.email,
      groupId: groupId,
    };

    const removeUserFromGroup = await request(app.getHttpServer())
      .put(`/group/user/delete/`)
      .send(requestBody)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const { message } = JSON.parse(removeUserFromGroup.text);
    t.is(removeUserFromGroup.status, 403);
    t.is(message, Messages.CANT_DELETE_LAST_USER);
  } catch (e) {
    console.error(e);
    throw e;
  }
});
