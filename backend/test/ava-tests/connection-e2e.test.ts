import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { Connection } from 'typeorm';
import { ApplicationModule } from '../../src/app.module';
import { AccessLevelEnum } from '../../src/enums';
import { Messages } from '../../src/exceptions/text/messages';
import { Constants } from '../../src/helpers/constants/constants';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { MockFactory } from '../mock.factory';
import { TestUtils } from '../utils/test.utils';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest;

type RegisterUserData = {
  email: string;
  password: string;
};
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  await app.init();
  app.getHttpServer().listen(0);
  testUtils = moduleFixture.get<TestUtils>(TestUtils);
  await testUtils.resetDb();
});

function getTestData() {
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

async function registerUserAndReturnUserInfo(): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  const adminUserRegisterInfo: RegisterUserData = {
    email: faker.internet.email(),
    password: 'ahalai-mahalai',
  };

  const registerAdminUserResponse = await request(app.getHttpServer())
    .post('/user/register/')
    .send(adminUserRegisterInfo)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  console.log(
    '🚀 ~ file: connection-e2e.test.ts ~ line 67 ~ registerUserAndReturnUserInfo ~ registerAdminUserResponse',
    registerAdminUserResponse.text,
  );

  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(registerAdminUserResponse)}`;
  return { token: token, ...adminUserRegisterInfo };
}

test.after.always('Close app connection', async () => {
  // await testUtils.resetDb();
  const connect = await app.get(Connection);
  if (connect.isConnected) {
    await connect.close();
  }
  await app.close();
});

currentTest = '> GET /connections >';
test(`${currentTest} should return all connections for this user`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
    t.is(result[0].hasOwnProperty('connection'), true);
    t.is(result[1].hasOwnProperty('accessLevel'), true);
    t.is(result[2].accessLevel, AccessLevelEnum.edit);
    t.is(uuidRegex.test(result[0].connection.id), true);
    t.is(result[3].hasOwnProperty('accessLevel'), true);
    t.is(result[4].connection.hasOwnProperty('host'), true);
    t.is(result[3].connection.hasOwnProperty('host'), true);
    t.is(typeof result[0].connection.port, 'number');
    t.is(result[2].connection.hasOwnProperty('username'), true);
    t.is(result[3].connection.hasOwnProperty('database'), true);
    t.is(result[4].connection.sid, null);
    t.is(result[0].connection.hasOwnProperty('createdAt'), true);
    t.is(result[1].connection.hasOwnProperty('updatedAt'), true);
    t.is(result[2].connection.hasOwnProperty('password'), false);
    t.is(result[3].connection.hasOwnProperty('groups'), false);
    t.pass();
  } catch (e) {
    throw e;
  }
});

currentTest = '> GET connection/users/:slug >';
test(`${currentTest} should return all connection users`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
    t.is(uuidRegex.test(foundUsersRO[0].id), true);
    t.is(foundUsersRO[0].isActive, false);
    t.is(foundUsersRO[0].hasOwnProperty('createdAt'), true);
    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should return all connection users from different groups`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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

    const requestBody = {
      email: 'SecondExample@gmail.com',
      groupId: createGroupRO.id,
    };
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    console.log('-> addUserInGroupResponse.text', addUserInGroupResponse.text);

    t.is(addUserInGroupResponse.status, 200);

    const findAllUsersResponse = await request(app.getHttpServer())
      .get(`/connection/users/${connectionRO.id}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');

    t.is(findAllUsersResponse.status, 200);
    const foundUsersRO = JSON.parse(findAllUsersResponse.text);
    t.is(foundUsersRO.length, 2);
    t.is(uuidRegex.test(foundUsersRO[0].id), true);
    t.is(uuidRegex.test(foundUsersRO[1].id), true);

    t.is(foundUsersRO[0].isActive, false);
    t.is(foundUsersRO[1].isActive, false);
    t.is(foundUsersRO[1].hasOwnProperty('email'), true);
    t.is(foundUsersRO[0].hasOwnProperty('email'), true);
    t.is(foundUsersRO[0].hasOwnProperty('createdAt'), true);
    t.is(foundUsersRO[1].hasOwnProperty('createdAt'), true);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception, when connection id is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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

    const requestBody = {
      email: 'SecondExample@gmail.com',
      groupId: createGroupRO.id,
    };

    const addUserInGroupResponse = await request(app.getHttpServer())
      .put(`/group/user/`)
      .send(requestBody)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');
    console.log('-> addUserInGroupResponse', addUserInGroupResponse.text);
    t.is(addUserInGroupResponse.status, 200);

    const fakeConnectionId = faker.datatype.uuid();
    const findAllUsersResponse = await request(app.getHttpServer())
      .get(`/connection/users/${fakeConnectionId}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');
    const findAllUsersRO = JSON.parse(findAllUsersResponse.text);
    t.is(findAllUsersResponse.status, 403);
    t.is(findAllUsersRO.message, Messages.DONT_HAVE_PERMISSIONS);

    t.pass();
  } catch (e) {
    throw e;
  }
});

currentTest = 'GET /connection/one/:slug';
test(`${currentTest} should return a found connection`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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

    t.is(findOneResponce.status, 200);
    const result = findOneResponce.body.connection;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, 'Test Connection');
    t.is(result.type, 'postgres');
    t.is(result.host, 'nestjs_testing');
    t.is(typeof result.port, 'number');
    t.is(result.port, 5432);
    t.is(result.username, 'postgres');
    t.is(result.database, 'nestjs_testing');
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), false);
    t.is(result.hasOwnProperty('author'), false);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception "id is missing" when connection id not passed in the request`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

currentTest = 'POST /connection';
test(`${currentTest} should return created connection`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const response = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 201);
    const result = JSON.parse(response.text);

    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, 'Test Connection');
    t.is(result.type, 'postgres');
    t.is(result.host, 'nestjs_testing');
    t.is(typeof result.port, 'number');
    t.is(result.port, 5432);
    t.is(result.username, 'postgres');
    t.is(result.database, 'nestjs_testing');
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), true);
    t.is(typeof result.groups, 'object');
    t.is(result.groups.length >= 1, true);
    t.is(uuidRegex.test(result.groups[0].id), true);

    const index = result.groups
      .map((e) => {
        return e.title;
      })
      .indexOf('Admin');

    t.is(index >= 0, true);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection without type`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    delete newConnection.type;
    const response = await request(app.getHttpServer())
      .post('/connection`')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 400);
    const { message } = JSON.parse(response.text);
    t.is(message, `${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}`);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection without host`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection without port`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection wit port value more than 65535`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
    newConnection.port = 65536;
    const response = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');

    t.is(response.status, 400);
    const { message } = JSON.parse(response.text);
    t.is(message, Messages.PORT_MISSING);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection wit port value less than 0`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    newConnection.port = -1;
    const response = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');

    t.is(response.status, 400);
    const { message } = JSON.parse(response.text);
    t.is(message, Messages.PORT_MISSING);
    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection without username`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection without database`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when create connection without password`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error with complex message when create connection without database, type, port`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
    t.is(
      message,
      `${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}, ${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}, ${Messages.DATABASE_MISSING}`,
    );

    t.pass();
  } catch (e) {
    throw e;
  }
});

currentTest = 'PUT /connection';
test(`${currentTest} should return updated connection`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, 'Updated Test Connection');
    t.is(result.type, 'postgres');
    t.is(result.host, 'testing_nestjs');
    t.is(typeof result.port, 'number');
    t.is(result.port, 5432);
    t.is(result.username, 'admin');
    t.is(result.database, 'testing_nestjs');
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), false);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} 'should throw error when update connection without type'`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
    t.is(message, `${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}`);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when update connection without host`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when update connection without port`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when update connection wit port value more than 65535`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
    t.is(message, Messages.PORT_MISSING);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when update connection wit port value less than 0`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
    t.is(message, Messages.PORT_MISSING);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when update connection without username`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error when update connection without database`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw error with complex message when update connection without database, type, port`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
    t.is(
      message,
      `${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}, ${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}, ${Messages.DATABASE_MISSING}`,
    );

    t.pass();
  } catch (e) {
    throw e;
  }
});

currentTest = 'DELETE /connection/:slug';
test(`${currentTest} should return delete result`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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

    t.is(result.hasOwnProperty('id'), false);
    t.is(result.title, 'Test Connection');
    t.is(result.type, 'postgres');
    t.is(result.host, 'nestjs_testing');
    t.is(typeof result.port, 'number');
    t.is(result.port, 5432);
    t.is(result.username, 'postgres');
    t.is(result.database, 'nestjs_testing');
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), false);
    t.is(result.hasOwnProperty('author'), false);
    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection not found`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResult = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');

    const createConnectionRO = JSON.parse(createConnectionResult.text);
    createConnectionRO.id = faker.datatype.uuid();

    const response = await request(app.getHttpServer())
      .put(`/connection/delete/${createConnectionRO.id}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');

    t.is(response.status, 403);

    const { message } = JSON.parse(response.text);
    t.is(message, Messages.DONT_HAVE_PERMISSIONS);
    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id not passed in the request`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

currentTest = 'POST /connection/group/:slug';
test(`${currentTest} should return a created group`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token, email } = await registerUserAndReturnUserInfo();

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
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, 'Generated test group DTO 1');
    t.is(result.hasOwnProperty('users'), true);
    t.is(typeof result.users, 'object');
    t.is(result.users.length, 1);
    t.is(result.users[0].email, email);
    t.is(result.users[0].isActive, false);
    t.is(uuidRegex.test(result.users[0].id), true);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} throw an exception when connectionId not passed in request`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} throw an exception when group title not passed in request`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
    t.is(message, Messages.GROUP_TITLE_MISSING);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} throw an exception when connectionId is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    createConnectionRO.id = faker.datatype.uuid();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} throw an exception when group name is not unique`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .set('Cookie', token)
      .send(newConnection)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createConnectionRO = JSON.parse(createConnectionResponse.text);
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
  } catch (e) {
    throw e;
  }
});

currentTest = 'PUT /connection/group/delete/:slug';
test(`${currentTest} should return connection without deleted group result`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, 'Generated test group DTO 1');

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
    t.is(result.hasOwnProperty('title'), true);
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
    const groupId = result[0].group.id;
    t.is(uuidRegex.test(groupId), true);
    t.is(result[0].group.hasOwnProperty('title'), true);
    t.is(result[0].accessLevel, AccessLevelEnum.edit);

    const index = result
      .map((e) => {
        return e.group.title;
      })
      .indexOf('Admin');

    t.is(index >= 0, true);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest}`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id is not passed in the request`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, 'Generated test group DTO 1');

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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when group id is not passed in the request`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, 'Generated test group DTO 1');

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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when group id is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, 'Generated test group DTO 1');

    const createGroupRO = JSON.parse(createGroupResponse.text);
    createGroupRO.id = faker.datatype.uuid();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, 'Generated test group DTO 1');

    const createGroupRO = JSON.parse(createGroupResponse.text);
    createConnectionRO.id = faker.datatype.uuid();
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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when trying delete admin group`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

currentTest = 'PUT /connection/encryption/restore/:slug';
test(`${currentTest} should return restored connection`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

currentTest = 'GET /connection/groups/:slug';
test(`${currentTest} should groups in connection`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
    const groupId = result[0].group.id;
    t.is(uuidRegex.test(groupId), true);
    t.is(result[1].group.hasOwnProperty('title'), true);
    t.is(result[0].accessLevel, AccessLevelEnum.edit);

    const index = result
      .map((e) => {
        return e.group.title;
      })
      .indexOf('Admin');

    t.is(index >= 0, true);

    t.pass();
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id not passed in the request`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

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
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id is invalid`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();
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
    createConnectionRO.id = faker.datatype.uuid();
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
  } catch (e) {
    throw e;
  }
});

//todo realise
currentTest = 'GET /connection/permissions';
currentTest = 'GET /connection/user/permissions';
// test(`${currentTest}`, async (t) => {
//   try {
//     const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
//     const { token } = await registerUserAndReturnUserInfo();
//     t.pass();
//   } catch (e) {
//     throw e;
//   }
// });
