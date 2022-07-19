import test from 'ava';
import { faker } from '@faker-js/faker';
import { ApplicationModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TestUtils } from '../utils/test.utils';
import { MockFactory } from '../mock.factory';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { Constants } from '../../src/helpers/constants/constants';
import { Connection } from 'typeorm';
import { AccessLevelEnum } from '../../src/enums';

const mockFactory = new MockFactory();
let app: INestApplication;
let connectionAdminUserToken;
let newConnection2;
let newConnection;
let newConnectionToTestDB;
let newGroup1;
let testUtils: TestUtils;
let updateConnection;
let currentTest;

type RegisterUserData = {
  email: string;
  password: string;
};

const adminUserRegisterInfo: RegisterUserData = {
  email: 'firstUser@example.com',
  password: 'ahalai-mahalai',
};
const simpleUserRegisterInfo: RegisterUserData = {
  email: 'secondUser@example.com',
  password: 'mahalai-ahalai',
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
  testUtils = moduleFixture.get<TestUtils>(TestUtils);
});

test.beforeEach(async () => {
  await testUtils.resetDb();
  newConnection = mockFactory.generateCreateConnectionDto();
  newConnection2 = mockFactory.generateCreateConnectionDto2();
  newConnectionToTestDB = mockFactory.generateCreateConnectionDtoToTEstDB();
  updateConnection = mockFactory.generateUpdateConnectionDto();
  newGroup1 = mockFactory.generateCreateGroupDto1();
});

async function registerUserAndReturnToken(): Promise<{
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

  connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
    registerAdminUserResponse,
  )}`;
  return { token: connectionAdminUserToken, ...adminUserRegisterInfo };
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
    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findAllConnectionsResponse.status, 200);
    t.is(findAllConnectionsResponse.body.connections.length, 4);

    let createConnectionResult = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createConnectionResult.status, 201);

    createConnectionResult = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection2)
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createConnectionResult.status, 201);

    const findAll = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', connectionAdminUserToken)
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
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createConnectionResponse.status, 201);

    const connectionRO = JSON.parse(createConnectionResponse.text);

    const findAllUsersResponse = await request(app.getHttpServer())
      .get(`/connection/users/${connectionRO.id}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', connectionAdminUserToken)
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
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createConnectionResponse.status, 201);

    const connectionRO = JSON.parse(createConnectionResponse.text);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', connectionAdminUserToken)
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
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(addUserInGroupResponse.status, 200);
    const result = JSON.parse(addUserInGroupResponse.text);

    const findAllUsersResponse = await request(app.getHttpServer())
      .get(`/connection/users/${connectionRO.id}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', connectionAdminUserToken)
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

// test(`${currentTest}`, async (t) => {
//   try {
//     t.pass();
//   } catch (e) {
//     throw e;
//   }
// });
//
// test(`${currentTest}`, async (t) => {
//   try {
//     t.pass();
//   } catch (e) {
//     throw e;
//   }
// });
//
// test(`${currentTest}`, async (t) => {
//   try {
//     t.pass();
//   } catch (e) {
//     throw e;
//   }
// });
//
// test(`${currentTest}`, async (t) => {
//   try {
//     t.pass();
//   } catch (e) {
//     throw e;
//   }
// });
//
// test(`${currentTest}`, async (t) => {
//   try {
//     t.pass();
//   } catch (e) {
//     throw e;
//   }
// });
