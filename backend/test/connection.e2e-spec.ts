import * as faker from 'faker';
import * as request from 'supertest';
import { AccessLevelEnum } from '../src/enums';
import { ApplicationModule } from '../src/app.module';
import { Connection } from 'typeorm';
import { DaoPostgres } from '../src/dal/dao/dao-postgres';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { Test } from '@nestjs/testing';
import { TestUtils } from './test.utils';
import { Constants } from '../src/helpers/constants/constants';
import * as cookieParser from 'cookie-parser';

describe('Connections (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnection2;
  let newConnectionToTestDB;
  let newGroup1;
  let updateConnection;
  let connectionAdminUserToken;

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

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
    newConnectionToTestDB = mockFactory.generateCreateConnectionDtoToTEstDB();
    updateConnection = mockFactory.generateUpdateConnectionDto();
    newGroup1 = mockFactory.generateCreateGroupDto1();

    const registerAdminUserResponse = await request(app.getHttpServer())
      .post('/user/register/')
      .send(adminUserRegisterInfo)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
      registerAdminUserResponse,
    )}`;
  });

  afterEach(async () => {
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
    await DaoPostgres.clearKnexCache();
  });

  afterAll(async () => {
    try {
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      const connect = await app.get(Connection);
      if (connect.isConnected) {
        await connect.close();
        await app.close();
      }
      await app.close();
    } catch (e) {
      console.error('After all connection error: ' + e);
    }
  });

  describe('GET /connections', () => {
    it('should return all connections for this user', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        let createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createConnectionResult.status).toBe(201);

        createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection2)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const findAllAuthorResponce = await request(app.getHttpServer())
          .get('/connections')
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findAllAuthorResponce.status).toBe(200);

        const result = findAllAuthorResponce.body.connections;
        expect(result.length).toBe(6);
        expect(result[0].hasOwnProperty('connection')).toBe(true);
        expect(result[1].hasOwnProperty('accessLevel')).toBe(true);
        expect(result[2].accessLevel).toBe(AccessLevelEnum.edit);
        expect(uuidRegex.test(result[0].connection.id)).toBe(true);
        expect(result[3].hasOwnProperty('accessLevel')).toBeTruthy();
        expect(result[4].connection.hasOwnProperty('host')).toBeTruthy();
        expect(result[3].connection.hasOwnProperty('host')).toBeTruthy();
        expect(typeof result[0].connection.port).toBe('number');
        expect(result[1].connection.hasOwnProperty('port')).toBeTruthy();
        expect(result[2].connection.hasOwnProperty('username')).toBeTruthy();
        expect(result[3].connection.hasOwnProperty('database')).toBeTruthy();
        expect(result[4].connection.sid).toBe(null);
        expect(result[0].connection.hasOwnProperty('createdAt')).toBe(true);
        expect(result[1].connection.hasOwnProperty('updatedAt')).toBe(true);
        expect(result[2].connection.hasOwnProperty('password')).toBe(false);
        expect(result[3].connection.hasOwnProperty('groups')).toBe(false);
        // expect(result[4].connection.hasOwnProperty('author')).toBe(true);
        // expect(typeof result[1].connection.author).toBe('object');
        // expect(result[2].connection.author.hasOwnProperty('id')).toBe(true);
        // expect(result[3].connection.author.hasOwnProperty('isActive')).toBe(true);
        // expect(result[4].connection.author.id).toBe('a876284a-e902-11ea-adc1-0242ac120002');
        // expect(result[0].connection.author.isActive).toBe(true);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('GET connection/users/:slug', () => {
    it('should return all connection users', async () => {
      jest.setTimeout(10000);
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const connectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(connectionResponse.status).toBe(201);
        const connectionRO = JSON.parse(connectionResponse.text);

        const findAllUsersResponce = await request(app.getHttpServer())
          .get(`/connection/users/${connectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(findAllUsersResponce.status).toBe(200);
        const foundUsersRO = JSON.parse(findAllUsersResponce.text);
        expect(foundUsersRO.length).toBe(1);
        expect(uuidRegex.test(foundUsersRO[0].id)).toBeTruthy();
        expect(foundUsersRO[0].isActive).toBeFalsy();
        //expect(foundUsersRO[0].email).toBe('Example@gmail.com');
        expect(foundUsersRO[0].hasOwnProperty('createdAt')).toBeTruthy();
      } catch (err) {
        throw err;
      }
    });

    it('should return all connection users from different groups', async () => {
      jest.setTimeout(10000);
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const connectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(connectionResponse.status).toBe(201);
        const connectionRO = JSON.parse(connectionResponse.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${connectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
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
        expect(addUserInGroupResponse.status).toBe(200);
        const result = JSON.parse(addUserInGroupResponse.text);

        const findAllUsersResponce = await request(app.getHttpServer())
          .get(`/connection/users/${connectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(findAllUsersResponce.status).toBe(200);
        const foundUsersRO = JSON.parse(findAllUsersResponce.text);
        expect(foundUsersRO.length).toBe(2);
        expect(uuidRegex.test(foundUsersRO[0].id)).toBeTruthy();
        expect(uuidRegex.test(foundUsersRO[1].id)).toBeTruthy();

        expect(foundUsersRO[0].isActive).toBeFalsy();
        expect(foundUsersRO[1].isActive).toBeFalsy();
        expect(foundUsersRO[1].hasOwnProperty('email')).toBeTruthy();
        expect(foundUsersRO[0].hasOwnProperty('email')).toBeTruthy();
        expect(foundUsersRO[0].hasOwnProperty('createdAt')).toBeTruthy();
        expect(foundUsersRO[1].hasOwnProperty('createdAt')).toBeTruthy();
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception, when connection id is incorrect', async () => {
      jest.setTimeout(10000);
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const connectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(connectionResponse.status).toBe(201);
        const connectionRO = JSON.parse(connectionResponse.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${connectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);
        const createGroupRO = JSON.parse(createGroupResponse.text);

        const requestBody = {
          email: 'SecondExample@gmail.com',
          groupId: createGroupRO.id,
        };
        const addUserInGroupResponse = await request(app.getHttpServer())
          .put(`/group/user/`)
          .send(requestBody)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(addUserInGroupResponse.status).toBe(200);

        const fakeConnectionId = faker.random.uuid();
        const findAllUsersResponce = await request(app.getHttpServer())
          .get(`/connection/users/${fakeConnectionId}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const findAllUsersRO = JSON.parse(findAllUsersResponce.text);
        expect(findAllUsersResponce.status).toBe(403);
        expect(findAllUsersRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('GET /connection/one/:slug', () => {
    it('should return a found connection', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        const findOneResponce = await request(app.getHttpServer())
          .get(`/connection/one/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(findOneResponce.status).toBe(200);
        const result = findOneResponce.body.connection;
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Test Connection');
        expect(result.type).toBe('postgres');
        expect(result.host).toBe('nestjs_testing');
        expect(typeof result.port).toBe('number');
        expect(result.port).toBe(5432);
        expect(result.username).toBe('postgres');
        expect(result.database).toBe('nestjs_testing');
        expect(result.sid).toBe(null);
        expect(result.hasOwnProperty('createdAt')).toBe(true);
        expect(result.hasOwnProperty('updatedAt')).toBe(true);
        expect(result.hasOwnProperty('password')).toBe(false);
        expect(result.hasOwnProperty('groups')).toBe(false);
        expect(result.hasOwnProperty('author')).toBe(false);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception "id is missing" when connection id not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        createConnectionRO.id = undefined;
        const findOneResponce = await request(app.getHttpServer())
          .get(`/connection/one/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(findOneResponce.status).toBe(400);
        const { message } = JSON.parse(findOneResponce.text);
        expect(message).toBe(Messages.CONNECTION_ID_MISSING);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('POST /connection', () => {
    it('should return created connection', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(201);
        const result = JSON.parse(response.text);

        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Test Connection');
        expect(result.type).toBe('postgres');
        expect(result.host).toBe('nestjs_testing');
        expect(typeof result.port).toBe('number');
        expect(result.port).toBe(5432);
        expect(result.username).toBe('postgres');
        expect(result.database).toBe('nestjs_testing');
        expect(result.sid).toBe(null);
        expect(result.hasOwnProperty('createdAt')).toBe(true);
        expect(result.hasOwnProperty('updatedAt')).toBe(true);
        expect(result.hasOwnProperty('password')).toBe(false);
        expect(result.hasOwnProperty('groups')).toBe(true);
        expect(typeof result.groups).toBe('object');
        expect(result.groups.length >= 1).toBe(true);
        expect(uuidRegex.test(result.groups[0].id)).toBe(true);

        const index = result.groups
          .map((e) => {
            return e.title;
          })
          .indexOf('Admin');

        expect(index >= 0).toBe(true);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection without type', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        delete newConnection.type;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(`${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}`);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection without host', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        delete newConnection.host;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.HOST_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection without port', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        delete newConnection.port;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(`${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}`);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection wit port value more than 65535', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        newConnection.port = 65536;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PORT_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection wit port value less than 0', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        newConnection.port = -1;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PORT_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection without username', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        delete newConnection.username;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.USERNAME_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection without database', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        delete newConnection.database;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.DATABASE_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when create connection without password', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        delete newConnection.password;
        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PASSWORD_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error with complex message when create connection without database, type, port', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        delete newConnection.database;
        delete newConnection.type;
        delete newConnection.port;

        const response = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(
          `${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}, ${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}, ${Messages.DATABASE_MISSING}`,
        );
      } catch (err) {
        throw err;
      }
    });
  });

  describe('PUT /connection', () => {
    it('should return updated connection', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        const updateConnectionResponse = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(updateConnectionResponse.status).toBe(200);
        const result = updateConnectionResponse.body.connection;
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Updated Test Connection');
        expect(result.type).toBe('postgres');
        expect(result.host).toBe('testing_nestjs');
        expect(typeof result.port).toBe('number');
        expect(result.port).toBe(5432);
        expect(result.username).toBe('admin');
        expect(result.database).toBe('testing_nestjs');
        expect(result.sid).toBe(null);
        expect(result.hasOwnProperty('createdAt')).toBe(true);
        expect(result.hasOwnProperty('updatedAt')).toBe(true);
        expect(result.hasOwnProperty('password')).toBe(false);
        expect(result.hasOwnProperty('groups')).toBe(false);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when update connection without type', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        delete updateConnection.type;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(`${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}`);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when update connection without host', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        delete updateConnection.host;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.HOST_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when update connection without port', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        delete updateConnection.port;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(`${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}`);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when update connection wit port value more than 65535', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        updateConnection.port = 65536;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PORT_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when update connection wit port value less than 0', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        updateConnection.port = -1;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PORT_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when update connection without username', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        delete updateConnection.username;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.USERNAME_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error when update connection without database', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        delete updateConnection.database;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.DATABASE_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw error with complex message when update connection without database, type, port', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        delete updateConnection.database;
        delete updateConnection.type;
        delete updateConnection.port;

        const response = await request(app.getHttpServer())
          .put(`/connection/${createConnectionRO.id}`)
          .send(updateConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(
          `${Messages.TYPE_MISSING}, ${Messages.CONNECTION_TYPE_INVALID}, ${Messages.PORT_MISSING}, ${Messages.PORT_FORMAT_INCORRECT}, ${Messages.DATABASE_MISSING}`,
        );
      } catch (err) {
        throw err;
      }
    });
  });

  describe('DELETE /connection/:slug', () => {
    it('should return delete result', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);

        const response = await request(app.getHttpServer())
          .put(`/connection/delete/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        const result = response.body;

        //deleted connection not found in database
        const findOneResponce = await request(app.getHttpServer())
          .get(`/connection/one/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(findOneResponce.status).toBe(403);

        const { message } = JSON.parse(findOneResponce.text);
        expect(message).toBe(Messages.DONT_HAVE_PERMISSIONS);

        expect(result.hasOwnProperty('id')).toBe(false);
        expect(result.title).toBe('Test Connection');
        expect(result.type).toBe('postgres');
        expect(result.host).toBe('nestjs_testing');
        expect(typeof result.port).toBe('number');
        expect(result.port).toBe(5432);
        expect(result.username).toBe('postgres');
        expect(result.database).toBe('nestjs_testing');
        expect(result.sid).toBe(null);
        expect(result.hasOwnProperty('createdAt')).toBe(true);
        expect(result.hasOwnProperty('updatedAt')).toBe(true);
        expect(result.hasOwnProperty('password')).toBe(false);
        expect(result.hasOwnProperty('groups')).toBe(false);
        expect(result.hasOwnProperty('author')).toBe(false);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connection not found', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);
        createConnectionRO.id = faker.random.uuid();

        const response = await request(app.getHttpServer())
          .put(`/connection/delete/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(403);

        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connection id not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);
        createConnectionRO.id = '';

        const response = await request(app.getHttpServer())
          .delete(`/connection/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('POST /connection/group/:slug', () => {
    it('return a created group', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResponse.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(createGroupResponse.status).toBe(201);
        const result = JSON.parse(createGroupResponse.text);
        expect(uuidRegex.test(result.id)).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');
        expect(result.hasOwnProperty('users')).toBe(true);
        expect(typeof result.users).toBe('object');
        expect(result.users.length).toBe(1);
        expect(result.users[0].email).toBe(adminUserRegisterInfo.email);
        expect(result.users[0].isActive).toBe(false);
        expect(uuidRegex.test(result.users[0].id)).toBe(true);
      } catch (err) {
        throw err;
      }
    });

    it('throw an exception when connectionId not passed in request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        createConnectionRO.id = '';
        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(createGroupResponse.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('throw an exception when group title not passed in request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        delete newGroup1.title;
        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const { message } = JSON.parse(createGroupResponse.text);

        expect(createGroupResponse.status).toBe(400);
        expect(message).toBe(Messages.GROUP_TITLE_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('throw an exception when connectionId is incorrect', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        createConnectionRO.id = faker.random.uuid();
        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const { message } = JSON.parse(createGroupResponse.text);

        expect(createGroupResponse.status).toBe(403);
        expect(message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });

    it('throw an exception when group name is not unique', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .set('Cookie', connectionAdminUserToken)
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        newGroup1.title = 'Admin';
        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(createGroupResponse.text);

        expect(createGroupResponse.status).toBe(400);
        expect(message).toBe(Messages.GROUP_NAME_UNIQUE);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('PUT /connection/group/delete/:slug', () => {
    it('should return connection without deleted group result', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        // create group in connection
        let result = createGroupResponse.body;

        expect(createGroupResponse.status).toBe(201);

        expect(result.hasOwnProperty('id')).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');

        const createGroupRO = JSON.parse(createGroupResponse.text);

        let response = await request(app.getHttpServer())
          .put(`/connection/group/delete/${createConnectionRO.id}`)
          .send({ groupId: createGroupRO.id })
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        //after deleting group
        result = response.body;

        expect(response.status).toBe(200);
        expect(result.hasOwnProperty('title')).toBe(true);
        expect(result.title).toBe(createGroupRO.title);
        expect(result.isMain).toBeFalsy();
        // check that group was deleted

        response = await request(app.getHttpServer())
          .get(`/connection/groups/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        result = JSON.parse(response.text);
        expect(result.length).toBe(1);
        const groupId = result[0].group.id;
        expect(uuidRegex.test(groupId)).toBe(true);
        expect(result[0].group.hasOwnProperty('title')).toBeTruthy();
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

    it('should throw an exception when connection id is not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        // create group in connection
        const result = createGroupResponse.body;

        expect(createGroupResponse.status).toBe(201);

        expect(result.hasOwnProperty('id')).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');

        const createGroupRO = JSON.parse(createGroupResponse.text);
        createConnectionRO.id = '';
        const response = await request(app.getHttpServer())
          .put(`/connection/group/delete/${createConnectionRO.id}`)
          .send({ groupId: createGroupRO.id })
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(response.text);
        expect(response.status).toBe(404);
        //expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when group id is not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        // create group in connection
        const result = createGroupResponse.body;

        expect(createGroupResponse.status).toBe(201);

        expect(result.hasOwnProperty('id')).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');

        const createGroupRO = JSON.parse(createGroupResponse.text);
        delete createGroupRO.id;
        const response = await request(app.getHttpServer())
          .put(`/connection/group/delete/${createConnectionRO.id}`)
          .send({ groupId: createGroupRO.id })
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(response.text);
        expect(response.status).toBe(400);
        expect(message).toBe(Messages.GROUP_ID_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when group id is incorrect', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        // create group in connection
        const result = createGroupResponse.body;

        expect(createGroupResponse.status).toBe(201);

        expect(result.hasOwnProperty('id')).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');

        const createGroupRO = JSON.parse(createGroupResponse.text);
        createGroupRO.id = faker.random.uuid();
        const response = await request(app.getHttpServer())
          .put(`/connection/group/delete/${createConnectionRO.id}`)
          .send({ groupId: createGroupRO.id })
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const { message } = JSON.parse(response.text);
        expect(response.status).toBe(400);
        expect(message).toBe(Messages.GROUP_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connection id is incorrect', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        // create group in connection
        const result = createGroupResponse.body;

        expect(createGroupResponse.status).toBe(201);

        expect(result.hasOwnProperty('id')).toBe(true);
        expect(result.title).toBe('Generated test group DTO 1');

        const createGroupRO = JSON.parse(createGroupResponse.text);
        createConnectionRO.id = faker.random.uuid();
        const response = await request(app.getHttpServer())
          .put(`/connection/group/delete/${createConnectionRO.id}`)
          .send({ groupId: createGroupRO.id })
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const { message } = JSON.parse(response.text);
        expect(response.status).toBe(403);
        expect(message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when trying delete admin group', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResult = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const createConnectionRO = JSON.parse(createConnectionResult.text);

        const response = await request(app.getHttpServer())
          .put(`/connection/group/delete/${createConnectionRO.id}`)
          .send({ groupId: createConnectionRO.groups[0].id })
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        const { message } = JSON.parse(response.text);
        expect(response.status).toBe(403);
        expect(message).toBe(Messages.CANT_DELETE_ADMIN_GROUP);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('PUT /connection/encryption/restore/:slug', () => {
    it('should return restored connection', async () => {
      const findAllConnectionsResponse = await request(app.getHttpServer())
        .get('/connections')
        .set('Content-Type', 'application/json')
        .set('Cookie', connectionAdminUserToken)
        .set('Accept', 'application/json');
      expect(findAllConnectionsResponse.status).toBe(200);
      expect(findAllConnectionsResponse.body.connections.length).toBe(4);

      const newPgConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
      newPgConnection.masterEncryption = true;

      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newPgConnection)
        .set('masterpwd', 'ahalaimahalai')
        .set('Cookie', connectionAdminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(createConnectionResult.status).toBe(201);

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      const { id, groups } = createConnectionRO;
      const groupId = groups[0].id;
      const restoreConnectionResult = await request(app.getHttpServer())
        .put(`/connection/encryption/restore/${id}`)
        .send(newPgConnection)
        .set('masterpwd', 'hamalaiahalai')
        .set('Cookie', connectionAdminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(restoreConnectionResult.status).toBe(200);
      const restoreConnectionResultRO = JSON.parse(restoreConnectionResult.text);
      const { connection } = restoreConnectionResultRO;
      expect(connection.id).toBe(id);

      const response = await request(app.getHttpServer())
        .get(`/connection/groups/${id}`)
        .set('Content-Type', 'application/json')
        .set('Cookie', connectionAdminUserToken)
        .set('Accept', 'application/json');

      const result = JSON.parse(response.text);
      expect(response.status).toBe(200);
      const groupIdInRestoredConnection = result[0].group.id;
      expect(groupIdInRestoredConnection).toBe(groupId);
    });
  });

  describe('GET /connection/groups/:slug', () => {
    it('should groups in connection', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(createGroupResponse.status).toBe(201);

        const response = await request(app.getHttpServer())
          .get(`/connection/groups/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        const result = JSON.parse(response.text);
        const groupId = result[0].group.id;
        expect(uuidRegex.test(groupId)).toBe(true);
        expect(result[1].group.hasOwnProperty('title')).toBeTruthy();
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

    it('should throw an exception when connection id not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(createGroupResponse.status).toBe(201);

        createConnectionRO.id = '';
        const response = await request(app.getHttpServer())
          .get(`/connection/groups/${createConnectionRO.id}`)
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connection id is invalid', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(createGroupResponse.status).toBe(201);
        createConnectionRO.id = faker.random.uuid();
        const response = await request(app.getHttpServer())
          .get(`/connection/groups/${createConnectionRO.id}`)
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        const getGroupsRO = JSON.parse(response.text);
        expect(Array.isArray(getGroupsRO)).toBeTruthy();
        expect(getGroupsRO.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });
  });

  xdescribe('GET /connection/permissions', () => {
    it('should return permissions object for current group in current connection', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        const response = await request(app.getHttpServer())
          .get(`/connection/permissions?connectionId=${createConnectionRO.id}&groupId=${createGroupRO.id}`)
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        const result = JSON.parse(response.text);

        expect(result.hasOwnProperty('connection')).toBe(true);
        expect(result.hasOwnProperty('group')).toBe(true);
        expect(result.hasOwnProperty('tables')).toBe(true);
        expect(typeof result.connection).toBe('object');
        expect(typeof result.group).toBe('object');
        expect(result.connection.connectionId).toBe(createConnectionRO.id);
        expect(result.group.groupId).toBe(createGroupRO.id);

        expect(typeof result.tables).toBe('object');

        const { tables } = result;
        expect(tables.length).toBe(10);
        expect(typeof tables[0]).toBe('object');
        expect(tables[1].hasOwnProperty('accessLevel')).toBe(true);
        expect(tables[0].accessLevel.visibility).toBe(true);
        expect(tables[1].accessLevel.readonly).toBe(false);
        expect(tables[0].accessLevel.add).toBe(true);
        expect(tables[2].accessLevel.delete).toBe(false);
        expect(tables[0].accessLevel.edit).toBe(true);
        expect(tables[0].accessLevel.readonly).toBe(false);
        expect(tables[3].accessLevel.add).toBe(false);
        expect(tables[4].accessLevel.visibility).toBe(false);
        expect(tables[5].accessLevel.readonly).toBe(false);
        expect(tables[6].accessLevel.edit).toBe(false);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connectionId not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Content-Type', 'application/json')
            .set('Cookie', connectionAdminUserToken)
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createConnectionRO.id = '';

        const response = await request(app.getHttpServer())
          .get(`/connection/permissions?connectionId=${createConnectionRO.id}&groupId=${createGroupRO.id}`)
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PARAMETER_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when groupId not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Content-Type', 'application/json')
            .set('Cookie', connectionAdminUserToken)
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createGroupRO.id = '';

        const response = await request(app.getHttpServer())
          .get(`/connection/permissions?connectionId=${createConnectionRO.id}&groupId=${createGroupRO.id}`)
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PARAMETER_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connectionId is incorrect', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createConnectionRO.id = faker.random.uuid();

        const response = await request(app.getHttpServer())
          .get(`/connection/permissions?connectionId=${createConnectionRO.id}&groupId=${createGroupRO.id}`)
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when groupId is incorrect', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createGroupRO.id = faker.random.uuid();

        const response = await request(app.getHttpServer())
          .get(`/connection/permissions?connectionId=${createConnectionRO.id}&groupId=${createGroupRO.id}`)
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(`${Messages.GROUP_NOT_FROM_THIS_CONNECTION}`);
      } catch (err) {
        throw err;
      }
    });
  });

  xdescribe('GET /connection/user/permissions', () => {
    it('should return users permissions object for current group in current connection', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .set('Cookie', connectionAdminUserToken)
          .send(newConnectionToTestDB)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        //************** for manually created non-admin group ******************
        //*** user is an author of this connection
        let response = await request(app.getHttpServer())
          .get(`/connection/user/permissions?connectionId=${createConnectionRO.id}&groupId=${createGroupRO.id}`)
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        let result = JSON.parse(response.text);

        expect(result.hasOwnProperty('connection')).toBe(true);
        expect(result.hasOwnProperty('group')).toBe(true);
        expect(result.hasOwnProperty('tables')).toBe(true);
        expect(typeof result.tables).toBe('object');
        expect(typeof result.connection).toBe('object');
        expect(typeof result.group).toBe('object');
        expect(result.connection.connectionId).toBe(createConnectionRO.id);
        expect(result.group.groupId).toBe(createGroupRO.id);
        expect(result.connection.accessLevel).toBe(AccessLevelEnum.edit);
        expect(result.group.accessLevel).toBe(AccessLevelEnum.edit);

        let { tables } = result;
        expect(tables.length).toBe(10);
        expect(typeof tables[0]).toBe('object');
        expect(tables[1].hasOwnProperty('accessLevel')).toBe(true);
        expect(tables[0].accessLevel.visibility).toBe(true);
        expect(tables[1].accessLevel.readonly).toBe(false);
        expect(tables[0].accessLevel.add).toBe(true);
        expect(tables[2].accessLevel.delete).toBe(true);
        expect(tables[0].accessLevel.edit).toBe(true);
        expect(tables[0].accessLevel.readonly).toBe(false);
        expect(tables[3].accessLevel.add).toBe(true);
        expect(tables[4].accessLevel.visibility).toBe(true);
        expect(tables[5].accessLevel.readonly).toBe(false);
        expect(tables[6].accessLevel.edit).toBe(true);

        //**********************************************************************

        //********************** for admin group *******************************
        //*** user is an author of this connection

        response = await request(app.getHttpServer())
          .get(
            `/connection/user/permissions?connectionId=${createConnectionRO.id}&groupId=${createConnectionRO.groups[0].id}`,
          )
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(200);
        result = JSON.parse(response.text);

        expect(result.hasOwnProperty('connection')).toBe(true);
        expect(result.hasOwnProperty('group')).toBe(true);
        expect(result.hasOwnProperty('tables')).toBe(true);
        expect(typeof result.tables).toBe('object');
        expect(typeof result.connection).toBe('object');
        expect(typeof result.group).toBe('object');
        expect(result.connection.connectionId).toBe(createConnectionRO.id);
        expect(result.group.groupId).toBe(createConnectionRO.groups[0].id);
        expect(result.connection.accessLevel).toBe(AccessLevelEnum.edit);
        expect(result.group.accessLevel).toBe(AccessLevelEnum.edit);

        tables = result.tables;
        expect(tables.length).toBe(10);
        expect(typeof tables[0]).toBe('object');
        expect(tables[1].hasOwnProperty('accessLevel')).toBe(true);
        expect(tables[0].accessLevel.visibility).toBe(true);
        expect(tables[1].accessLevel.readonly).toBe(false);
        expect(tables[0].accessLevel.add).toBe(true);
        expect(tables[2].accessLevel.delete).toBe(true);
        expect(tables[0].accessLevel.edit).toBe(true);
        expect(tables[0].accessLevel.readonly).toBe(false);
        expect(tables[3].accessLevel.add).toBe(true);
        expect(tables[4].accessLevel.visibility).toBe(true);
        expect(tables[5].accessLevel.readonly).toBe(false);
        expect(tables[6].accessLevel.edit).toBe(true);

        //**********************************************************************
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connectionId not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createConnectionRO.id = '';

        const response = await request(app.getHttpServer())
          .get(
            `/connection/user/permissions?connectionId=${createConnectionRO.id}&groupId=${createConnectionRO.groups[0].id}`,
          )
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PARAMETER_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when groupId not passed in the request', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .set('Cookie', connectionAdminUserToken)
          .send(newConnectionToTestDB)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createConnectionRO.groups[0].id = '';

        const response = await request(app.getHttpServer())
          .get(
            `/connection/user/permissions?connectionId=${createConnectionRO.id}&groupId=${createConnectionRO.groups[0].id}`,
          )
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.PARAMETER_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connectionId in the request is incorrect', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createConnectionRO.id = faker.random.uuid();

        const response = await request(app.getHttpServer())
          .get(
            `/connection/user/permissions?connectionId=${createConnectionRO.id}&groupId=${createConnectionRO.groups[0].id}`,
          )
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when groupId in the request is incorrect', async () => {
      try {
        const findAllConnectionsResponse = await request(app.getHttpServer())
          .get('/connections')
          .set('Content-Type', 'application/json')
          .set('Cookie', connectionAdminUserToken)
          .set('Accept', 'application/json');
        expect(findAllConnectionsResponse.status).toBe(200);
        expect(findAllConnectionsResponse.body.connections.length).toBe(4);

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createGroupResponse = await request(app.getHttpServer())
          .post(`/connection/group/${createConnectionRO.id}`)
          .send(newGroup1)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createGroupResponse.status).toBe(201);

        const createGroupRO = JSON.parse(createGroupResponse.text);

        const permissionsForUsers = mockFactory.generateUserPermissionsArray(createGroupRO.id);
        for (let i = 0; i < permissionsForUsers.length; i++) {
          const createPermissionResponse = await request(app.getHttpServer())
            .post(`/permission/group/${createGroupRO.id}`)
            .send(permissionsForUsers[i])
            .set('Content-Type', 'application/json')
            .set('Cookie', connectionAdminUserToken)
            .set('Accept', 'application/json');
          expect(createPermissionResponse.status).toBe(201);
        }

        expect(createGroupResponse.status).toBe(201);

        createConnectionRO.groups[0].id = faker.random.uuid();

        const response = await request(app.getHttpServer())
          .get(
            `/connection/user/permissions?connectionId=${createConnectionRO.id}&groupId=${createConnectionRO.groups[0].id}`,
          )
          .send(newConnection)
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(response.status).toBe(400);
        const { message } = JSON.parse(response.text);
        expect(message).toBe(`${Messages.GROUP_NOT_FROM_THIS_CONNECTION}`);
      } catch (err) {
        throw err;
      }
    });
  });
});
