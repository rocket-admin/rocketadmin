import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import * as faker from 'faker';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';

import { AccessLevelEnum } from '../src/enums';
import { ApplicationModule } from '../src/app.module';
import { Connection } from 'typeorm';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { Test } from '@nestjs/testing';
import { TestUtils } from './utils/test.utils';
import { Constants } from '../src/helpers/constants/constants';
import { Cacher } from '../src/helpers/cache/cacher';

describe('Groups (e2e)', () => {
  type RegisterUserData = {
    email: string;
    password: string;
  };
  jest.setTimeout(10000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnection2;
  let newGroup1;
  let newCognitoUserName;
  let firstUserToken: string;
  let secondUserToken: string;

  const firstUserRegisterInfo: RegisterUserData = {
    email: 'firstUser@example.com',
    password: 'ahalai-mahalai',
  };
  const secondUserRegisterInfo: RegisterUserData = {
    email: 'secondUser@example.com',
    password: 'mahalai-ahalai',
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();

    testUtils = moduleFixture.get<TestUtils>(TestUtils);
    await testUtils.resetDb();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    newConnection = mockFactory.generateCreateConnectionDto();
    newConnection2 = mockFactory.generateCreateConnectionDto2();
    newGroup1 = mockFactory.generateCreateGroupDto1();
    newCognitoUserName = mockFactory.generateCognitoUserName();

    const registerFirstUserResponse = await request(app.getHttpServer())
      .post('/user/register/')
      .send(firstUserRegisterInfo)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const registerSecondUserResponse = await request(app.getHttpServer())
      .post('/user/register/')
      .send(secondUserRegisterInfo)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    // .set('Cookie', ['myApp-token=12345667', 'myApp-other=blah'])
    firstUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(registerFirstUserResponse)}`;
    secondUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
      registerSecondUserResponse,
    )}`;
  });

  beforeAll(() => {
    jest.setTimeout(600000);
  });

  afterEach(async () => {
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
  });

  afterAll(async () => {
    try {
      await Cacher.clearAllCache();
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      const connect = await app.get(Connection);
      if (connect.isConnected) {
        await connect.close();
      }
      await app.close();
    } catch (e) {
      console.error('After all group error: ' + e);
    }
  });

  describe('GET /groups', () => {
    jest.setTimeout(30000);
    it('Should return all user groups', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const findAllUserGroups = await request(app.getHttpServer())
          .get(`/connection/groups/${createConnectionRO.id}`)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findAllUserGroups.status).toBe(200);

        const result = JSON.parse(findAllUserGroups.text);

        expect(result.length === 2).toBe(true);
        expect(uuidRegex.test(result[0].group.id)).toBe(true);
        expect(result[1].group.hasOwnProperty('users')).toBe(false);
        expect(result[0].group.hasOwnProperty('title')).toBeTruthy();
        expect(result[1].accessLevel).toBe(AccessLevelEnum.edit);
      } catch (err) {
        throw err;
      }
    });
    jest.setTimeout(30000);
  });

  describe('GET /group/users/:slug', () => {
    it('should return all users in current group', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
        const createGroupRO = JSON.parse(createGroupResponse.text);

        const findAllUsersInGroup = await request(app.getHttpServer())
          .get(`/group/users/${createGroupRO.id}`)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findAllUsersInGroup.status).toBe(200);
        const result = JSON.parse(findAllUsersInGroup.text);
        expect(result.length === 1).toBe(true);
        expect(uuidRegex.test(result[0].id)).toBe(true);
        // expect(result[0].isActive).toBe(true);
        expect(result[0].email).toBe(firstUserRegisterInfo.email);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when group id is not real', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
        const createGroupRO = JSON.parse(createGroupResponse.text);

        createGroupRO.id = faker.random.uuid();
        const findAllUsersInGroup = await request(app.getHttpServer())
          .get(`/group/users/${createGroupRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findAllUsersInGroup.status).toBe(400);
        const { message } = JSON.parse(findAllUsersInGroup.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when group id not passed', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
        const createGroupRO = JSON.parse(createGroupResponse.text);

        createGroupRO.id = '';
        const findAllUsersInGroup = await request(app.getHttpServer())
          .get(`/group/users/${createGroupRO.id}`)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findAllUsersInGroup.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('PUT /group/user/:slug', () => {
    it('should return a group with new added user', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
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
        expect(findAllUsersInGroup.status).toBe(200);

        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');
        expect(result.users.length).toBe(2);
        expect(typeof result.users[1]).toBe('object');
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
        expect(result.users[1].email).toBe(secondUserRegisterInfo.email);
        // expect(result.users[0].isActive).toBe(true);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when groupId not passed in request', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
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

        expect(addUserInGroup.status).toBe(400);
        const { message } = JSON.parse(addUserInGroup.text);
        expect(message).toBe(Messages.GROUP_ID_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when user email not passed in request', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

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

        expect(addUserInGroup.status).toBe(400);
        const { message } = JSON.parse(addUserInGroup.text);
        expect(message).toBe(Messages.USER_EMAIL_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when groupId is incorrect', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);
        createGroupRO.id = faker.random.uuid();
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

        expect(addUserInGroup.status).toBe(400);
        const { message } = JSON.parse(addUserInGroup.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when add a user what been already added in this group', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

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

        expect(addUserInGroup1.status).toBe(200);

        const addUserInGroup2 = await request(app.getHttpServer())
          .put(`/group/user/`)
          .send(requestBody)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(addUserInGroup2.status).toBe(400);
        const { message } = JSON.parse(addUserInGroup2.text);
        expect(message).toBe(Messages.USER_ALREADY_ADDED_BUT_NOT_ACTIVE);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('DELETE /group', () => {
    it('should return an delete result', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const deleteResult = await request(app.getHttpServer())
          .delete(`/group/${createGroupRO.id}`)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const deleteResultRO = JSON.parse(deleteResult.text);
        expect(deleteResult.status).toBe(200);
        expect(typeof deleteResult).toBe('object');
        expect(deleteResultRO.isMain).toBe(false);

        const response = await request(app.getHttpServer())
          .get(`/connection/groups/${createConnectionRO.id}`)
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        const result = JSON.parse(response.text);
        const groupId = result[0].group.id;
        expect(result.length).toBe(1);
        expect(uuidRegex.test(groupId)).toBe(true);
        expect(result[0].group.title).toBe('Admin');
        expect(result[0].accessLevel).toBe(AccessLevelEnum.edit);

        const index = result
          .map((e) => {
            return e.group.title;
          })
          .indexOf('Admin');

        expect(index >= 0).toBe(true);
      } catch (err) {
        throw err;
      }
    });

    it('should return throw an exception when groupId is incorrect', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        createGroupRO.id = faker.random.uuid();
        const deleteResult = await request(app.getHttpServer())
          .delete(`/group/${createGroupRO.id}`)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteResult.status).toBe(400);
        const { message } = JSON.parse(deleteResult.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should return throw an exception when groupId is not passed in request', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        createGroupRO.id = '';
        const deleteResult = await request(app.getHttpServer())
          .delete(`/group/${createGroupRO.id}`)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteResult.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('PUT /group/user/delete', () => {
    it('should return a group without deleted user', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
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

        expect(addUserInGroup.status).toBe(200);
        let result = JSON.parse(addUserInGroup.text).group;
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');
        expect(result.users.length).toBe(2);
        expect(typeof result.users[1]).toBe('object');
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
        expect(result.users[1].email).toBe(secondUserRegisterInfo.email);
        // expect(result.users[0].isActive).toBe(true);

        const removeUserFromGroup = await request(app.getHttpServer())
          .put(`/group/user/delete/`)
          .send(requestBody)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        result = JSON.parse(removeUserFromGroup.text);

        expect(typeof result).toBe('object');
        expect(result.title).toBe('Generated test group DTO 1');
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.hasOwnProperty('users')).toBe(true);
        expect(typeof result.users).toBe('object');
        expect(result.users.length).toBe(1);
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
        // expect(result.users[0].isActive).toBe(true);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error, when group id not passed in request', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
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

        expect(addUserInGroup.status).toBe(200);
        const result = JSON.parse(addUserInGroup.text).group;
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');
        expect(result.users.length).toBe(2);
        expect(typeof result.users[1]).toBe('object');
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
        expect(result.users[1].email).toBe(secondUserRegisterInfo.email);
        // expect(result.users[0].isActive).toBe(true);

        requestBody.groupId = undefined;
        const removeUserFromGroup = await request(app.getHttpServer())
          .put(`/group/user/delete/`)
          .send(requestBody)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(removeUserFromGroup.text);
        expect(removeUserFromGroup.status).toBe(400);
        expect(message).toBe(Messages.GROUP_ID_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error, when email is not passed in request', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
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

        expect(addUserInGroup.status).toBe(200);
        const result = JSON.parse(addUserInGroup.text).group;
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');
        expect(result.users.length).toBe(2);
        expect(typeof result.users[1]).toBe('object');
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
        expect(result.users[1].email).toBe(secondUserRegisterInfo.email);
        // expect(result.users[0].isActive).toBe(true);

        requestBody.email = undefined;
        const removeUserFromGroup = await request(app.getHttpServer())
          .put(`/group/user/delete/`)
          .send(requestBody)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(removeUserFromGroup.text);
        expect(removeUserFromGroup.status).toBe(400);
        expect(message).toBe(Messages.USER_EMAIL_MISSING);
      } catch (err) {
        throw err;
      }
    });

    xit('should throw an error, when there is no this email in database', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
        const createGroupRO = JSON.parse(createGroupResponse.text);

        AWSMock.restore('CognitoIdentityServiceProvider');
        const fakeUserUuid = faker.random.uuid();
        AWSMock.setSDKInstance(AWS);
        AWSMock.mock(
          'CognitoIdentityServiceProvider',
          'listUsers',
          (newCognitoUserName, callback: (...args: any) => void) => {
            callback(null, {
              Users: [
                {
                  Username: fakeUserUuid,
                  Attributes: [
                    {},
                    {
                      Name: 'sub',
                      Value: fakeUserUuid,
                    },
                    {
                      name: 'email',
                      Value: 'Example@gmail.com',
                    },
                  ],
                },
              ],
            });
          },
        );

        const requestBody = {
          email: 'SecondExample@gmail.com',
          groupId: createGroupRO.id,
        };
        const addUserInGroup = await request(app.getHttpServer())
          .put(`/group/user/`)
          .send(requestBody)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(addUserInGroup.status).toBe(200);
        const result = JSON.parse(addUserInGroup.text);
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');
        expect(result.users.length).toBe(2);
        expect(typeof result.users[1]).toBe('object');
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
        expect(result.users[1].id).toBe(fakeUserUuid);
        expect(result.users[0].isActive).toBe(true);

        AWSMock.restore('CognitoIdentityServiceProvider');

        const removeUserFromGroup = await request(app.getHttpServer())
          .put(`/group/user/delete/`)
          .send(requestBody)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(removeUserFromGroup.text);
        expect(removeUserFromGroup.status).toBe(400);
        expect(message).toBe(Messages.USER_EMAIL_NOT_FOUND(requestBody.email));
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error, when group id is incorrect', async () => {
      try {
        let createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
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

        expect(addUserInGroup.status).toBe(200);
        const result = JSON.parse(addUserInGroup.text).group;
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');
        expect(result.users.length).toBe(2);
        expect(typeof result.users[1]).toBe('object');
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
        expect(result.users[1].email).toBe(secondUserRegisterInfo.email);
        // expect(result.users[0].isActive).toBe(true);

        requestBody.groupId = faker.random.uuid();
        const removeUserFromGroup = await request(app.getHttpServer())
          .put(`/group/user/delete/`)
          .send(requestBody)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(removeUserFromGroup.text);
        expect(removeUserFromGroup.status).toBe(400);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error, trying delete last user from admin group', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', firstUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        expect(createConnectionResponse.status).toBe(201);

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
        expect(removeUserFromGroup.status).toBe(403);
        expect(message).toBe(Messages.CANT_DELETE_LAST_USER);
      } catch (err) {
        throw err;
      }
    });
  });
});
