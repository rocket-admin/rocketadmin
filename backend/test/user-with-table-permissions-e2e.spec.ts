import * as faker from 'faker';
import { knex } from 'knex';
import * as request from 'supertest';

import { AccessLevelEnum, QueryOrderingEnum } from '../src/enums';
import { ApplicationModule } from '../src/app.module';
import { compareArrayElements } from '../src/helpers';
import { Connection } from 'typeorm';
import { Constants } from '../src/helpers/constants/constants';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { Test } from '@nestjs/testing';
import { TestUtils } from './utils/test.utils';
import * as cookieParser from 'cookie-parser';
import { Cacher } from '../src/helpers/cache/cacher';

describe('User permissions (connection readonly, group readonly) (e2e)', () => {
  jest.setTimeout(50000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnection2;
  let newConnectionToTestDB;
  let newGroup1;
  let updateConnection;
  let connectionAdminUserToken;
  let simpleUserToken;
  let newTableWidget;
  let newRandomGroup2;
  let newTableWidgets;
  let updatedTableWidgets;
  const testTableName = 'users';
  const testTableColumnName = 'name';
  const testTAbleSecondColumnName = 'email';
  const testSearchedUserName = 'Vasia';
  const testEntitiesSeedsCount = 42;

  const tablePermissions = {
    visibility: true,
    readonly: false,
    add: true,
    delete: true,
    edit: false,
  };

  async function resetPostgresTestDB() {
    const { host, username, password, database, port, type, ssl, cert } = newConnection;
    const Knex = knex({
      client: type,
      connection: {
        host: host,
        user: username,
        password: password,
        database: database,
        port: port,
      },
    });
    await Knex.schema.dropTableIfExists(testTableName);
    await Knex.schema.createTableIfNotExists(testTableName, function (table) {
      table.increments();
      table.string(testTableColumnName);
      table.string(testTAbleSecondColumnName);
      table.timestamps();
    });

    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName).insert({
          [testTableColumnName]: testSearchedUserName,
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        await Knex(testTableName).insert({
          [testTableColumnName]: faker.name.findName(),
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    await Knex.destroy();
  }

  async function resetMySQLTestDB() {
    const { host, username, password, database, port, type, ssl, cert } = newConnection2;
    const Knex = knex({
      client: 'mysql2',
      connection: {
        host: host,
        user: username,
        password: password,
        database: database,
        port: port,
      },
    });
    await Knex.schema.dropTableIfExists(testTableName);
    await Knex.schema.createTableIfNotExists(testTableName, function (table) {
      table.increments();
      table.string(testTableColumnName);
      table.string(testTAbleSecondColumnName);
      table.timestamps();
    });

    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName).insert({
          [testTableColumnName]: testSearchedUserName,
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        await Knex(testTableName).insert({
          [testTableColumnName]: faker.name.findName(),
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    await Knex.destroy();
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const thirdUserRegisterInfo: RegisterUserData = {
    email: 'third@example.com',
    password: 'hamalai-lahalai',
  };

  beforeAll(() => {
    jest.setTimeout(30000);
  });
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
    newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
    newConnection2 = mockFactory.generateConnectionToTestMySQLDBInDocker();
    newConnectionToTestDB = mockFactory.generateCreateConnectionDtoToTEstDB();
    updateConnection = mockFactory.generateUpdateConnectionDto();
    newGroup1 = mockFactory.generateCreateGroupDto1();
    newTableWidget = mockFactory.generateCreateWidgetDTOForConnectionTable();
    newRandomGroup2 = MockFactory.generateCreateGroupDtoWithRandomTitle();
    newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable();
    updatedTableWidgets = mockFactory.generateUpdateWidgetDTOsArrayForUsersTable();
    await resetPostgresTestDB();
    await resetMySQLTestDB();

    const registerAdminUserResponse = await request(app.getHttpServer())
      .post('/user/register/')
      .send(adminUserRegisterInfo)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const registerSimpleUserResponse = await request(app.getHttpServer())
      .post('/user/register/')
      .send(simpleUserRegisterInfo)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
      registerAdminUserResponse,
    )}`;
    simpleUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
      registerSimpleUserResponse,
    )}`;
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
      console.error('After all user-different-table-only-permissions error' + e);
    }
  });

  //****************************************** SUPPORT FUNCTIONS *********************************************************
  async function createAdminConnections() {
    await request(app.getHttpServer())
      .post('/connection')
      .set('Cookie', connectionAdminUserToken)
      .send(newConnection)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    await request(app.getHttpServer())
      .post('/connection')
      .set('Cookie', connectionAdminUserToken)
      .send(newConnection2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
  }

  async function createConnectionsAndInviteNewUserInNewGroupInFirstConnection() {
    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse.status).toBe(200);
    const connectionsId = {
      firstId: null,
      secondId: null,
      firstAdminGroupId: null,
    };
    const createFirstConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .set('Cookie', connectionAdminUserToken)
      .send(newConnection)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createFirstConnectionRO = JSON.parse(createFirstConnectionResponse.text);
    connectionsId.firstId = createFirstConnectionRO.id;
    const createSecondConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .set('Cookie', connectionAdminUserToken)
      .send(newConnection2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const firstConnectionRO = JSON.parse(createSecondConnectionResponse.text);
    connectionsId.secondId = firstConnectionRO.id;
    // const getGroupsInFirstConnection = await request(app.getHttpServer())
    //   .get(`/connection/groups/${createFirstConnectionRO.id}`)
    //   .set('Cookie', connectionAdminUserToken)
    //   .set('Content-Type', 'application/json')
    //   .set('Accept', 'application/json');
    // const groupId = JSON.parse(getGroupsInFirstConnection.text)[0].group.id;
    const email = simpleUserRegisterInfo.email;

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connectionsId.firstId}`)
      .set('Cookie', connectionAdminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const groupId = JSON.parse(createGroupResponse.text).id;

    const permissions = {
      connection: {
        connectionId: connectionsId.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: groupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: 'users',
          accessLevel: tablePermissions,
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${groupId}`)
      .send({ permissions })
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const findAllConnectionsResponse_2 = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse_2.status).toBe(200);
    await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', connectionAdminUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    connectionsId.firstAdminGroupId = groupId;

    const getUsers = await request(app.getHttpServer())
      .get(`/group/users/${groupId}`)
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    return connectionsId;
  }

  //******************************************* TESTS BEGIN *************************************************************

  //***************************************** USER NOT ADDED INTO ADMIN GROUP
  describe('When new user not added in admin group', () => {
    //****************************** CONNECTION CONTROLLER

    describe('Connection controller', () => {
      describe('GET /connections/', () => {
        it('should return connections, where second user have access', async () => {
          try {
            await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const findAll = await request(app.getHttpServer())
              .get('/connections')
              .set('Content-Type', 'application/json')
              .set('Cookie', simpleUserToken)
              .set('Accept', 'application/json');
            const findAllRo = JSON.parse(findAll.text);
            expect(findAll.status).toBe(200);

            const result = findAll.body.connections;
            expect(result.length).toBe(5);
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
            expect(result[4].connection.hasOwnProperty('sid')).toBeTruthy();
            expect(result[0].connection.hasOwnProperty('createdAt')).toBe(true);
            expect(result[1].connection.hasOwnProperty('updatedAt')).toBe(true);
            expect(result[2].connection.hasOwnProperty('password')).toBe(false);
            expect(result[3].connection.hasOwnProperty('groups')).toBe(false);
            expect(result[4].connection.hasOwnProperty('author')).toBe(false);
          } catch (e) {
            throw e;
          }
        });
      });

      describe('GET /connection/one/:slug', () => {
        it('should return a found connection', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          try {
            const searchedConnectionId = connectionIds.firstId;
            const findOneResponce = await request(app.getHttpServer())
              .get(`/connection/one/${searchedConnectionId}`)
              .set('Content-Type', 'application/json')
              .set('Cookie', simpleUserToken)
              .set('Accept', 'application/json');
            expect(findOneResponce.status).toBe(200);

            const result = findOneResponce.body.connection;
            expect(uuidRegex.test(result.id)).toBe(true);
            expect(result.title).toBe(newConnection.title);
            expect(result.type).toBe('postgres');
            expect(result.host).toBe(newConnection.host);
            expect(typeof result.port).toBe('number');
            expect(result.port).toBe(newConnection.port);
            expect(result.username).toBe('postgres');
            expect(result.database).toBe(newConnection.database);
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

        it('should throw an exception, when you do not have permission in this connection', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          try {
            const searchedConnectionId = connectionIds.secondId;
            const findOneResponce = await request(app.getHttpServer())
              .get(`/connection/one/${searchedConnectionId}`)
              .set('Content-Type', 'application/json')
              .set('Cookie', simpleUserToken)
              .set('Accept', 'application/json');
            // todo add checking connection object properties
            expect(findOneResponce.status).toBe(403);
            expect(JSON.parse(findOneResponce.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('PUT /connection', () => {
        it('should throw exception you do not have permission', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          try {
            const updateConnectionResponse = await request(app.getHttpServer())
              .put(`/connection/${connectionIds.firstId}`)
              .send(updateConnection)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(updateConnectionResponse.status).toBe(403);
            expect(JSON.parse(updateConnectionResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });

        it('should return throw an exception, when you try update a connection without permissions in it', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          try {
            const updateConnectionResponse = await request(app.getHttpServer())
              .put(`/connection/${connectionIds.secondId}`)
              .send(updateConnection)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(updateConnectionResponse.status).toBe(403);
            expect(JSON.parse(updateConnectionResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('DELETE /connection/:slug', () => {
        it('should throw an exception do not have permissions', async () => {
          try {
            const connectionsIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const response = await request(app.getHttpServer())
              .put(`/connection/delete/${connectionsIds.firstId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(response.status).toBe(403);
            expect(JSON.parse(response.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);

            //deleted connection found in database
            const findOneResponce = await request(app.getHttpServer())
              .get(`/connection/one/${connectionsIds.firstId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(findOneResponce.status).toBe(200);
            expect(JSON.parse(findOneResponce.text).connection.id).toBe(connectionsIds.firstId);
          } catch (err) {
            throw err;
          }
        });

        it('should throw an exception, when you try to delete connection without permission', async () => {
          try {
            const connectionsIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const response = await request(app.getHttpServer())
              .put(`/connection/delete/${connectionsIds.secondId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(response.status).toBe(403);
            expect(JSON.parse(response.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);

            //connection wasn't deleted
            const findOneResponce = await request(app.getHttpServer())
              .get(`/connection/one/${connectionsIds.firstId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(findOneResponce.status).toBe(200);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('POST /connection/group/:slug', () => {
        it('should throw an exception don not have permission', async () => {
          try {
            const connectionIDs = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

            const createGroupResponse = await request(app.getHttpServer())
              .post(`/connection/group/${connectionIDs.firstId}`)
              .set('Cookie', simpleUserToken)
              .send(newGroup1)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(createGroupResponse.status).toBe(403);
            expect(JSON.parse(createGroupResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });

        it('should throw an exception when you try add group in connection without permission in it', async () => {
          try {
            const connectionIDs = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

            const createGroupResponse = await request(app.getHttpServer())
              .post(`/connection/group/${connectionIDs.secondId}`)
              .set('Cookie', simpleUserToken)
              .send(newGroup1)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(createGroupResponse.status).toBe(403);
            expect(JSON.parse(createGroupResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('PUT /connection/group/delete/:slug', () => {
        it('should return connection without deleted group result', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const newGroup1 = MockFactory.generateCreateGroupDtoWithRandomTitle();
            const createGroupResponse = await request(app.getHttpServer())
              .post(`/connection/group/${connectionIds.firstId}`)
              .set('Cookie', connectionAdminUserToken)
              .send(newGroup1)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            // create group in connection
            let result = createGroupResponse.body;
            expect(createGroupResponse.status).toBe(201);

            expect(result.hasOwnProperty('id')).toBe(true);
            expect(result.title).toBe(newGroup1.title);

            const createGroupRO = JSON.parse(createGroupResponse.text);

            const response = await request(app.getHttpServer())
              .put(`/connection/group/delete/${connectionIds.firstId}`)
              .set('Cookie', simpleUserToken)
              .send({ groupId: createGroupRO.id })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            //after deleting group
            result = response.body;

            expect(response.status).toBe(403);
            expect(JSON.parse(response.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });

        it('should throw an exception, when you try delete group in connection without permissions', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

            const createGroupResponse = await request(app.getHttpServer())
              .post(`/connection/group/${connectionIds.secondId}`)
              .set('Cookie', connectionAdminUserToken)
              .send(newGroup1)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            // create group in connection
            const result = createGroupResponse.body;

            expect(createGroupResponse.status).toBe(201);

            expect(result.hasOwnProperty('id')).toBe(true);
            expect(result.title).toBe('Generated test group DTO 1');

            const createGroupRO = JSON.parse(createGroupResponse.text);

            const response = await request(app.getHttpServer())
              .put(`/connection/group/delete/${connectionIds.secondId}`)
              .set('Cookie', simpleUserToken)
              .send({ groupId: createGroupRO.id })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(response.status).toBe(403);
            expect(JSON.parse(response.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('GET /connection/groups/:slug', () => {
        it('should groups in connection', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

            const createGroupResponse = await request(app.getHttpServer())
              .post(`/connection/group/${connectionIds.firstId}`)
              .set('Cookie', connectionAdminUserToken)
              .send(newRandomGroup2)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(createGroupResponse.status).toBe(201);

            const response = await request(app.getHttpServer())
              .get(`/connection/groups/${connectionIds.firstId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(response.status).toBe(200);
            const result = JSON.parse(response.text);
            const groupId = result[0].group.id;
            expect(uuidRegex.test(groupId)).toBe(true);
            expect(result[0].group.hasOwnProperty('title')).toBeTruthy();
            expect(result[0].accessLevel).toBe(AccessLevelEnum.readonly);

            const index = result
              .map((e) => {
                return e.group.title;
              })
              .indexOf('Admin');

            expect(index >= 0).toBe(false);
          } catch (err) {
            throw err;
          }
        });

        it('it should throw an exception, when you try get groups in connection, where you do not have permission', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

            const createGroupResponse = await request(app.getHttpServer())
              .post(`/connection/group/${connectionIds.secondId}`)
              .set('Cookie', connectionAdminUserToken)
              .send(newGroup1)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(createGroupResponse.status).toBe(201);

            const response = await request(app.getHttpServer())
              .get(`/connection/groups/${connectionIds.secondId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(response.status).toBe(200);

            const result = JSON.parse(response.text);
            expect(result.length).toBe(0);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('GET /connection/permissions', () => {
        it('should return permissions object for current group in current connection', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const getGroupsResponse = await request(app.getHttpServer())
              .get(`/connection/groups/${connectionIds.firstId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(getGroupsResponse.status).toBe(200);
            const getGroupsRO = JSON.parse(getGroupsResponse.text);
            const groupId = getGroupsRO[0].group.id;

            const response = await request(app.getHttpServer())
              .get(`/connection/permissions?connectionId=${connectionIds.firstId}&groupId=${groupId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            const result = JSON.parse(response.text);
            expect(response.status).toBe(200);

            expect(result.hasOwnProperty('connection')).toBe(true);
            expect(result.hasOwnProperty('group')).toBe(true);
            expect(result.hasOwnProperty('tables')).toBe(true);
            expect(typeof result.connection).toBe('object');
            expect(typeof result.group).toBe('object');
            expect(result.connection.connectionId).toBe(connectionIds.firstId);
            expect(result.group.groupId).toBe(groupId);
            expect(result.connection.accessLevel).toBe(AccessLevelEnum.readonly);
            expect(result.group.accessLevel).toBe(AccessLevelEnum.readonly);
            expect(typeof result.tables).toBe('object');

            const { tables } = result;
            expect(tables.length).toBe(1);
            expect(typeof tables[0]).toBe('object');
            expect(tables[0].hasOwnProperty('accessLevel')).toBe(true);
            expect(tables[0].accessLevel.visibility).toBe(tablePermissions.visibility);
            expect(tables[0].accessLevel.readonly).toBe(tablePermissions.readonly);
            expect(tables[0].accessLevel.add).toBe(tablePermissions.add);
            expect(tables[0].accessLevel.delete).toBe(tablePermissions.delete);
            expect(tables[0].accessLevel.edit).toBe(tablePermissions.edit);
          } catch (err) {
            throw err;
          }
        });

        xit('should throw an exception, when you try get...', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const getGroupsResponse = await request(app.getHttpServer())
              .get(`/connection/groups/${connectionIds.secondId}`)
              .set('Cookie', connectionAdminUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(getGroupsResponse.status).toBe(200);
            const getGroupsRO = JSON.parse(getGroupsResponse.text);
            const groupId = getGroupsRO[0].group.id;

            const getUsers = await request(app.getHttpServer())
              .get(`/group/users/${groupId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            const response = await request(app.getHttpServer())
              .get(`/connection/permissions?connectionId=${connectionIds.secondId}&groupId=${groupId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            const result = JSON.parse(response.text);

            expect(response.status).toBe(200);

            expect(result.hasOwnProperty('connection')).toBe(true);
            expect(result.hasOwnProperty('group')).toBe(true);
            expect(result.hasOwnProperty('tables')).toBe(true);
            expect(typeof result.connection).toBe('object');
            expect(typeof result.group).toBe('object');
            expect(result.connection.connectionId).toBe(connectionIds.secondId);
            expect(result.group.groupId).toBe(groupId);
            expect(result.connection.accessLevel).toBe(AccessLevelEnum.edit);
            expect(result.group.accessLevel).toBe(AccessLevelEnum.edit);
            expect(typeof result.tables).toBe('object');

            const { tables } = result;
            expect(tables.length).toBe(1);
            expect(typeof tables[0]).toBe('object');
            expect(tables[0].hasOwnProperty('accessLevel')).toBe(true);
            expect(tables[0].accessLevel.visibility).toBe(false);
            expect(tables[0].accessLevel.readonly).toBe(false);
            expect(tables[0].accessLevel.add).toBe(false);
            expect(tables[0].accessLevel.delete).toBe(false);
            expect(tables[0].accessLevel.edit).toBe(false);
            expect(tables[0].accessLevel.readonly).toBe(false);
            expect(tables[0].accessLevel.add).toBe(false);
            expect(tables[0].accessLevel.visibility).toBe(false);
            expect(tables[0].accessLevel.readonly).toBe(false);
            expect(tables[0].accessLevel.edit).toBe(false);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('GET /connection/user/permissions', () => {
        it('should return permissions object for current group in current connection', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const getGroupsResponse = await request(app.getHttpServer())
              .get(`/connection/groups/${connectionIds.firstId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(getGroupsResponse.status).toBe(200);
            const getGroupsRO = JSON.parse(getGroupsResponse.text);
            const groupId = getGroupsRO[0].group.id;

            const response = await request(app.getHttpServer())
              .get(`/connection/user/permissions?connectionId=${connectionIds.firstId}&groupId=${groupId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(response.status).toBe(200);
            const result = JSON.parse(response.text);

            expect(result.hasOwnProperty('connection')).toBe(true);
            expect(result.hasOwnProperty('group')).toBe(true);
            expect(result.hasOwnProperty('tables')).toBe(true);
            expect(typeof result.connection).toBe('object');
            expect(typeof result.group).toBe('object');
            expect(result.connection.connectionId).toBe(connectionIds.firstId);
            expect(result.group.groupId).toBe(groupId);
            expect(result.connection.accessLevel).toBe(AccessLevelEnum.readonly);
            expect(result.group.accessLevel).toBe(AccessLevelEnum.readonly);
            expect(typeof result.tables).toBe('object');

            const { tables } = result;
            expect(tables.length).toBe(1);
            expect(typeof tables[0]).toBe('object');
            expect(tables[0].hasOwnProperty('accessLevel')).toBe(true);
            expect(tables[0].accessLevel.visibility).toBe(tablePermissions.visibility);
            expect(tables[0].accessLevel.readonly).toBe(tablePermissions.readonly);
            expect(tables[0].accessLevel.add).toBe(tablePermissions.add);
            expect(tables[0].accessLevel.delete).toBe(tablePermissions.delete);
            expect(tables[0].accessLevel.edit).toBe(tablePermissions.edit);
          } catch (err) {
            throw err;
          }
        });

        it('should return permissions object for current group in current connection for current user', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const getGroupsResponse = await request(app.getHttpServer())
              .get(`/connection/groups/${connectionIds.secondId}`)
              .set('Cookie', connectionAdminUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(getGroupsResponse.status).toBe(200);
            const getGroupsRO = JSON.parse(getGroupsResponse.text);

            const groupId = getGroupsRO[0].group.id;

            const response = await request(app.getHttpServer())
              .get(`/connection/user/permissions?connectionId=${connectionIds.secondId}&groupId=${groupId}`)
              .set('Cookie', simpleUserToken)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');

            expect(response.status).toBe(200);
            const result = JSON.parse(response.text);

            expect(result.hasOwnProperty('connection')).toBe(true);
            expect(result.hasOwnProperty('group')).toBe(true);
            expect(result.hasOwnProperty('tables')).toBe(true);
            expect(typeof result.connection).toBe('object');
            expect(typeof result.group).toBe('object');
            expect(result.connection.connectionId).toBe(connectionIds.secondId);
            expect(result.group.groupId).toBe(groupId);
            expect(result.connection.accessLevel).toBe(AccessLevelEnum.none);
            expect(result.group.accessLevel).toBe(AccessLevelEnum.none);
            expect(typeof result.tables).toBe('object');

            const { tables } = result;
            expect(tables.length).toBe(1);
            expect(typeof tables[0]).toBe('object');
            expect(tables[0].hasOwnProperty('accessLevel')).toBe(true);
            expect(tables[0].accessLevel.visibility).toBe(false);
            expect(tables[0].accessLevel.readonly).toBe(false);
            expect(tables[0].accessLevel.add).toBe(false);
            expect(tables[0].accessLevel.delete).toBe(false);
            expect(tables[0].accessLevel.edit).toBe(false);
            expect(tables[0].accessLevel.edit).toBe(false);
          } catch (err) {
            throw err;
          }
        });
      });
    });

    //****************************** GROUP CONTROLLER

    describe('Group controller', () => {
      describe('GET /groups/', () => {
        it('should return found groups with current user', async () => {
          await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/groups/`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);
          const { groups, groupsCount } = getGroupsRO;
          expect(groupsCount).toBe(5);
          expect(groups.length).toBe(5);
          expect(groups[0].hasOwnProperty('group')).toBeTruthy();
          expect(groups[1].hasOwnProperty('accessLevel')).toBeTruthy();
          expect(uuidRegex.test(groups[0].group.id)).toBeTruthy();
          expect(groups[2].group.hasOwnProperty('title')).toBeTruthy();
          expect(groups[3].group.hasOwnProperty('isMain')).toBeTruthy();
        });
      });

      describe('GET /group/users/:slug', () => {
        it('it should return users in group', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);
          const nonAdminGroupIndex = getGroupsRO.findIndex((element) => {
            return !element.group.isMain;
          });
          const groupId = getGroupsRO[nonAdminGroupIndex].group.id;

          const response = await request(app.getHttpServer())
            .get(`/group/users/${groupId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getUsersRO = JSON.parse(response.text);
          expect(getUsersRO.length).toBe(2);
          expect(getUsersRO[0].id === getUsersRO[1].id).toBeFalsy();
          expect(getUsersRO[0].hasOwnProperty('createdAt')).toBeTruthy();
          expect(getUsersRO[0].hasOwnProperty('password')).toBeFalsy();
          expect(getUsersRO[0].hasOwnProperty('isActive')).toBeTruthy();
          expect(getUsersRO[0].hasOwnProperty('email')).toBeTruthy();
        });

        it('it should throw an exception when you try to receive user in group where you dont have permission', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.secondId}`)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;

          const response = await request(app.getHttpServer())
            .get(`/group/users/${groupId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getUsersRO = JSON.parse(response.text);
          expect(getUsersRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });
      });

      describe('PUT /group/user', () => {
        it('should return group with added user', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;
          const email = thirdUserRegisterInfo.email;
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', simpleUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(addUserInGroupResponse.status).toBe(403);
          const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
          expect(addUserInGroupRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw exception, when user email not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;

          const email = thirdUserRegisterInfo.email;
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', simpleUserToken)
            .send({ groupId })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
          expect(addUserInGroupResponse.status).toBe(403);
          expect(addUserInGroupRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw exception, when group id not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;
          const email = thirdUserRegisterInfo.email;
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', simpleUserToken)
            .send({ email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
          expect(addUserInGroupResponse.status).toBe(400);
          expect(addUserInGroupRO.message).toBe(Messages.GROUP_ID_MISSING);
        });

        it('should throw exception, when group id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const email = thirdUserRegisterInfo.email;
          const groupId = faker.random.uuid();
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', simpleUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
          expect(addUserInGroupResponse.status).toBe(400);
          expect(addUserInGroupRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
        });
      });

      describe('DELETE /group/:slug', () => {
        it('should delete result after group deletion', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);

          const groupId = JSON.parse(getGroupsResponse.text)[0].group.id;
          const deleteGroupResponse = await request(app.getHttpServer())
            .delete(`/group/${groupId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(deleteGroupResponse.status).toBe(403);
          const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
          expect(deleteGroupRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        xit('should throw an exception when you try delete admin group', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);
          const adminGroupIndex = getGroupsRO.findIndex;
          const groupId = getGroupsRO[0].group.id;
          const deleteGroupResponse = await request(app.getHttpServer())
            .delete(`/group/${groupId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
          expect(deleteGroupRO.message).toBe(Messages.CANT_DELETE_ADMIN_GROUP);
        });

        it('should throw an exception when group id not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;
          const deleteGroupResponse = await request(app.getHttpServer())
            .delete(`/group/`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(deleteGroupResponse.status).toBe(404);
        });

        it('should throw an exception when group id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);

          const groupId = faker.random.uuid();
          const deleteGroupResponse = await request(app.getHttpServer())
            .delete(`/group/${groupId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
          expect(deleteGroupRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
        });
      });

      describe('PUT /group/user/delete', () => {
        it('should return group without deleted user', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;

          const email = thirdUserRegisterInfo.email;
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', connectionAdminUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(addUserInGroupResponse.status).toBe(200);

          const deleteUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user/delete')
            .set('Cookie', simpleUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(deleteUserInGroupResponse.status).toBe(403);
          const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
          expect(deleteUserInGroupRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw exception, when user email not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;

          const email = thirdUserRegisterInfo.email;
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', connectionAdminUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(addUserInGroupResponse.status).toBe(200);

          const deleteUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user/delete')
            .set('Cookie', simpleUserToken)
            .send({ groupId })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
          expect(deleteUserInGroupRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw exception, when group id not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;

          const email = thirdUserRegisterInfo.email;
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', connectionAdminUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(addUserInGroupResponse.status).toBe(200);

          const deleteUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user/delete')
            .set('Cookie', simpleUserToken)
            .send({ email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
          expect(deleteUserInGroupRO.message).toBe(Messages.GROUP_ID_MISSING);
        });

        it('should throw exception, when group id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          let groupId = getGroupsRO[0].group.id;

          const email = thirdUserRegisterInfo.email;
          const addUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user')
            .set('Cookie', connectionAdminUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(addUserInGroupResponse.status).toBe(200);

          groupId = faker.random.uuid();
          const deleteUserInGroupResponse = await request(app.getHttpServer())
            .put('/group/user/delete')
            .set('Cookie', simpleUserToken)
            .send({ groupId, email })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
          expect(deleteUserInGroupRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
        });
      });
    });

    //****************************** PERMISSION CONTROLLER

    describe('Permission controller', () => {
      describe('PUT permissions/:slug', () => {
        it('should throw an exception do not have permission', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const newGroup1 = MockFactory.generateCreateGroupDtoWithRandomTitle();
          const createGroupResponse = await request(app.getHttpServer())
            .post(`/connection/group/${connectionIds.firstId}`)
            .set('Cookie', connectionAdminUserToken)
            .send(newGroup1)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createGroupRO = JSON.parse(createGroupResponse.text);
          expect(createGroupResponse.status).toBe(201);
          const newGroupId = createGroupRO.id;

          const permissions = {
            connection: {
              connectionId: connectionIds.firstId,
              accessLevel: AccessLevelEnum.readonly,
            },
            group: {
              groupId: newGroupId,
              accessLevel: AccessLevelEnum.readonly,
            },
            tables: [
              {
                tableName: 'users',
                accessLevel: {
                  visibility: true,
                  readonly: false,
                  add: true,
                  delete: true,
                  edit: false,
                },
              },
            ],
          };

          const createOrUpdatePermissionResponse = await request(app.getHttpServer())
            .put(`/permissions/${newGroupId}`)
            .send({ permissions })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
          expect(createOrUpdatePermissionResponse.status).toBe(403);
          expect(createOrUpdatePermissionRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw an exception, whe you try update permission and do not have permission ', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getGroupsResponse = await request(app.getHttpServer())
            .get(`/connection/groups/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(getGroupsResponse.status).toBe(200);
          const getGroupsRO = JSON.parse(getGroupsResponse.text);

          const groupId = getGroupsRO[0].group.id;

          const permissions = {
            connection: {
              connectionId: connectionIds.firstId,
              accessLevel: AccessLevelEnum.none,
            },
            group: {
              groupId: groupId,
              accessLevel: AccessLevelEnum.readonly,
            },
            tables: [
              {
                tableName: 'users',
                accessLevel: {
                  visibility: true,
                  readonly: false,
                  add: false,
                  delete: false,
                  edit: true,
                },
              },
            ],
          };

          const createOrUpdatePermissionResponse = await request(app.getHttpServer())
            .put(`/permissions/${groupId}`)
            .send({ permissions })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
          expect(createOrUpdatePermissionResponse.status).toBe(403);
          expect(createOrUpdatePermissionRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        xit('should throw an exception, when you try change admin group', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
          const permissions = {
            connection: {
              connectionId: connectionIds.firstId,
              accessLevel: AccessLevelEnum.edit,
            },
            group: {
              groupId: connectionIds.firstAdminGroupId,
              accessLevel: AccessLevelEnum.none,
            },
            tables: [
              {
                tableName: 'users',
                accessLevel: {
                  visibility: true,
                  readonly: false,
                  add: true,
                  delete: true,
                  edit: false,
                },
              },
            ],
          };

          const createOrUpdatePermissionResponse = await request(app.getHttpServer())
            .put(`/permissions/${connectionIds.firstAdminGroupId}`)
            .send({ permissions })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
          expect(createOrUpdatePermissionResponse.status).toBe(400);
          expect(createOrUpdatePermissionRO.message).toBe(Messages.CANNOT_CHANGE_ADMIN_GROUP);
        });
      });
    });

    //****************************** TABLE CONTROLLER

    describe('Table controller', () => {
      describe('GET /connection/tables/:slug', () => {
        it('should return all tables in connection', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTablesInConnection = await request(app.getHttpServer())
            .get(`/connection/tables/${connectionIds.firstId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesInConnection.status).toBe(200);
          const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
          expect(getTablesInConnectionRO.length).toBe(1);
          expect(getTablesInConnectionRO[0].table).toBe('users');
          expect(typeof getTablesInConnectionRO[0].permissions).toBe('object');
          const { visibility, readonly, add, delete: del, edit } = getTablesInConnectionRO[0].permissions;
          expect(visibility).toBe(tablePermissions.visibility);
          expect(readonly).toBe(tablePermissions.readonly);
          expect(del).toBe(tablePermissions.delete);
          expect(edit).toBe(tablePermissions.edit);
          expect(add).toBe(tablePermissions.add);
        });

        it('should throw an exception, when connection id not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTablesInConnection = await request(app.getHttpServer())
            .get(`/connection/tables/`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesInConnection.status).toBe(404);
        });

        it('should throw an exception, when connection id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeConnectionId = faker.random.uuid();
          const getTablesInConnection = await request(app.getHttpServer())
            .get(`/connection/tables/${fakeConnectionId}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesInConnection.status).toBe(400);
          const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
          expect(getTablesInConnectionRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
        });
      });

      describe('GET /table/rows/:slug', () => {
        it('should return found rows from table', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTableRows = await request(app.getHttpServer())
            .get(`/table/rows/${connectionIds.firstId}?tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRows.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRows.text);
          const { rows, primaryColumns, pagination, sortable_by, structure, foreignKeys } = getTableRowsRO;
          expect(rows.length).toBe(Constants.DEFAULT_PAGINATION.perPage);
          expect(primaryColumns.length).toBe(1);
          expect(primaryColumns[0].column_name).toBe('id');
          expect(primaryColumns[0].data_type).toBe('integer');
          expect(sortable_by.length).toBe(0);
          expect(structure.length).toBe(5);
          expect(foreignKeys.length).toBe(0);
        });

        it('should throw an exception when connection id not passed in request', async () => {
          const getTablesRows = await request(app.getHttpServer())
            .get(`/table/rows/?tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesRows.status).toBe(404);
        });

        it('should throw an exception when connection id passed in request is incorrect', async () => {
          const fakeId = faker.random.uuid();
          const getTableRows = await request(app.getHttpServer())
            .get(`/table/rows/${fakeId}?tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRows.status).toBe(400);
          const getTablesInConnectionRO = JSON.parse(getTableRows.text);
          expect(getTablesInConnectionRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
        });

        it('should throw an exception when table name passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeTableName = faker.random.word(1);
          const getTablesRows = await request(app.getHttpServer())
            .get(`/table/rows/${connectionIds.firstId}?tableName=${fakeTableName}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesRows.status).toBe(400);
          const getTablesInConnectionRO = JSON.parse(getTablesRows.text);
          expect(getTablesInConnectionRO.message).toBe(Messages.TABLE_NOT_FOUND);
        });
      });

      describe('GET /table/structure/:slug', () => {
        it('should return table structure', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTablesStructure = await request(app.getHttpServer())
            .get(`/table/structure/${connectionIds.firstId}?tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesStructure.status).toBe(200);
          const getTableStructureRO = JSON.parse(getTablesStructure.text);
          const { structure, primaryColumns, foreignKeys, readonly_fields, table_widgets } = getTableStructureRO;
          expect(structure.length).toBe(5);
          expect(primaryColumns.length).toBe(1);
          expect(primaryColumns[0].column_name).toBe('id');
          expect(primaryColumns[0].data_type).toBe('integer');
          expect(readonly_fields.length).toBe(0);
          expect(table_widgets.length).toBe(0);
          expect(foreignKeys.length).toBe(0);
        });

        it('should throw an exception when connection id not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTablesStructure = await request(app.getHttpServer())
            .get(`/table/structure/?tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesStructure.status).toBe(404);
        });

        it('should throw an exception when connection id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeConnectionId = faker.random.uuid();
          const getTablesStructure = await request(app.getHttpServer())
            .get(`/table/structure/${fakeConnectionId}?tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesStructure.status).toBe(400);
          const getTablesStructureRO = JSON.parse(getTablesStructure.text);
          expect(getTablesStructureRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
        });

        it('should throw an exception when table name not passed in request', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTablesStructure = await request(app.getHttpServer())
            .get(`/table/structure/${connectionIds.firstId}?tableName=`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesStructure.status).toBe(400);
          const getTablesStructureRO = JSON.parse(getTablesStructure.text);
          expect(getTablesStructureRO.message).toBe(Messages.TABLE_NAME_MISSING);
        });

        it('should throw an exception when table name passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeTableName = faker.random.word(1);
          const getTablesStructure = await request(app.getHttpServer())
            .get(`/table/structure/${connectionIds.firstId}?tableName=${fakeTableName}`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesStructure.status).toBe(400);
          const getTablesStructureRO = JSON.parse(getTablesStructure.text);
          expect(getTablesStructureRO.message).toBe(Messages.TABLE_NOT_FOUND);
        });
      });

      describe('POST /table/row/:slug', () => {
        it('should return added row', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const randomName = faker.name.findName();
          const randomEmail = faker.name.findName();
          /* eslint-disable */
          const created_at = new Date();
          const updated_at = new Date();
          const addRowInTable = await request(app.getHttpServer())
            .post(`/table/row/${connectionIds.firstId}?tableName=users`)
            .send({
              name: randomName,
              email: randomEmail,
              created_at: created_at,
              updated_at: updated_at,
            })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(addRowInTable.text);
          expect(addRowInTable.status).toBe(201);
          expect(addRowInTableRO.row.hasOwnProperty('id')).toBeTruthy();
          expect(addRowInTableRO.row.name).toBe(randomName);
          expect(addRowInTableRO.row.email).toBe(randomEmail);
          expect(addRowInTableRO.row.hasOwnProperty('created_at')).toBeTruthy();
          expect(addRowInTableRO.row.hasOwnProperty('updated_at')).toBeTruthy();
          expect(addRowInTableRO.hasOwnProperty('structure')).toBeTruthy();
          expect(addRowInTableRO.hasOwnProperty('foreignKeys')).toBeTruthy();
          expect(addRowInTableRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(addRowInTableRO.hasOwnProperty('readonly_fields')).toBeTruthy();
          /* eslint-enable */
        });

        it('should throw an exception when connection id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const randomName = faker.name.findName();
          const randomEmail = faker.name.findName();
          /* eslint-disable */
          const created_at = new Date();
          const updated_at = new Date();
          const fakeConnectionId = faker.random.uuid();
          const addRowInTable = await request(app.getHttpServer())
            .post(`/table/row/${fakeConnectionId}?tableName=users`)
            .send({
              name: randomName,
              email: randomEmail,
              created_at: created_at,
              updated_at: updated_at,
            })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(addRowInTable.text);
          expect(addRowInTableRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
          /* eslint-enable */
        });

        it('should throw an exception when table name passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const randomName = faker.name.findName();
          const randomEmail = faker.name.findName();
          /* eslint-disable */
          const created_at = new Date();
          const updated_at = new Date();
          const fakeTableName = faker.random.word(1);
          const addRowInTable = await request(app.getHttpServer())
            .post(`/table/row/${connectionIds.firstId}?tableName=${fakeTableName}`)
            .send({
              name: randomName,
              email: randomEmail,
              created_at: created_at,
              updated_at: updated_at,
            })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(addRowInTable.text);
          expect(addRowInTableRO.message).toBe(Messages.TABLE_NOT_FOUND);
          /* eslint-enable */
        });
      });

      describe('PUT /table/row/:slug', () => {
        it('should throw an exception do not have permission, when you do not have edit permission ', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const randomName = faker.name.findName();
          const randomEmail = faker.name.findName();
          /* eslint-disable */
          const created_at = new Date();
          const updated_at = new Date();
          const updateRowInTable = await request(app.getHttpServer())
            .put(`/table/row/${connectionIds.firstId}?tableName=users&id=2`)
            .send({
              name: randomName,
              email: randomEmail,
              created_at: created_at,
              updated_at: updated_at,
            })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(updateRowInTable.text);
          expect(updateRowInTable.status).toBe(403);
          expect(addRowInTableRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);

          /* eslint-enable */
        });

        it('should throw an exception when connection id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const randomName = faker.name.findName();
          const randomEmail = faker.name.findName();
          /* eslint-disable */
          const created_at = new Date();
          const updated_at = new Date();
          const fakeConnectionId = faker.random.uuid();
          const addRowInTable = await request(app.getHttpServer())
            .put(`/table/row/${fakeConnectionId}?tableName=users&id=1`)
            .send({
              name: randomName,
              email: randomEmail,
              created_at: created_at,
              updated_at: updated_at,
            })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(addRowInTable.text);
          expect(addRowInTableRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
          /* eslint-enable */
        });

        it('should throw an exception when table name passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const randomName = faker.name.findName();
          const randomEmail = faker.name.findName();
          /* eslint-disable */
          const created_at = new Date();
          const updated_at = new Date();
          const fakeTableName = faker.random.word(1);
          const addRowInTable = await request(app.getHttpServer())
            .put(`/table/row/${connectionIds.firstId}?tableName=${fakeTableName}&id=1`)
            .send({
              name: randomName,
              email: randomEmail,
              created_at: created_at,
              updated_at: updated_at,
            })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(addRowInTable.text);
          expect(addRowInTableRO.message).toBe(Messages.TABLE_NOT_FOUND);
          /* eslint-enable */
        });
      });

      describe('DELETE /table/row/:slug', () => {
        it('should return delete result', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          /* eslint-disable */
          const deleteRowInTable = await request(app.getHttpServer())
            .delete(`/table/row/${connectionIds.firstId}?tableName=users&id=1`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(deleteRowInTable.status).toBe(200);
          /* eslint-enable */
        });

        it('should throw an exception when connection id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeConnectionId = faker.random.uuid();
          const deleteRowInTable = await request(app.getHttpServer())
            .delete(`/table/row/${fakeConnectionId}?tableName=users&id=1`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteRowInTableRO = JSON.parse(deleteRowInTable.text);
          expect(deleteRowInTableRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
          expect(deleteRowInTable.status).toBe(400);
        });

        it('should throw an exception when table name passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeTableName = faker.random.word(1);
          const deleteRowInTable = await request(app.getHttpServer())
            .delete(`/table/row/${connectionIds.firstId}?tableName=${fakeTableName}&id=1`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteRowInTabbleRO = JSON.parse(deleteRowInTable.text);
          expect(deleteRowInTabbleRO.message).toBe(Messages.TABLE_NOT_FOUND);
        });
      });

      describe('GET /table/row/:slug', () => {
        it('should return row', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getRowInTable = await request(app.getHttpServer())
            .get(`/table/row/${connectionIds.firstId}?tableName=users&id=5`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getRowInTableRO = JSON.parse(getRowInTable.text);
          expect(getRowInTable.status).toBe(200);
          expect(getRowInTableRO.row.id).toBe(5);
          expect(getRowInTableRO.row.hasOwnProperty('created_at')).toBeTruthy();
          expect(getRowInTableRO.row.hasOwnProperty('updated_at')).toBeTruthy();
          expect(getRowInTableRO.hasOwnProperty('structure')).toBeTruthy();
          expect(getRowInTableRO.hasOwnProperty('foreignKeys')).toBeTruthy();
          expect(getRowInTableRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getRowInTableRO.hasOwnProperty('readonly_fields')).toBeTruthy();
        });

        it('should throw an exception when connection id passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeConnectionId = faker.random.uuid();
          const addRowInTable = await request(app.getHttpServer())
            .get(`/table/row/${fakeConnectionId}?tableName=users&id=5`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(addRowInTable.text);
          expect(addRowInTableRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
        });

        it('should throw an exception when table name passed in request is incorrect', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const fakeTableName = faker.random.word(1);
          const addRowInTable = await request(app.getHttpServer())
            .get(`/table/row/${connectionIds.firstId}?tableName=${fakeTableName}&id=5`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const addRowInTableRO = JSON.parse(addRowInTable.text);
          expect(addRowInTableRO.message).toBe(Messages.TABLE_NOT_FOUND);
          /* eslint-enable */
        });
      });
    });

    //****************************** TABLE LOGS CONTROLLER

    describe('Table logs controller', () => {
      describe('GET /logs/:slug', () => {
        it('should return all found logs in connection', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const randomName = faker.name.findName();
          const randomEmail = faker.name.findName();
          /* eslint-disable */
          const created_at = new Date();
          const updated_at = new Date();
          const addRowInTable = await request(app.getHttpServer())
            .post(`/table/row/${connectionIds.firstId}?tableName=users`)
            .send({
              name: randomName,
              email: randomEmail,
              created_at: created_at,
              updated_at: updated_at,
            })
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(addRowInTable.status).toBe(201);

          const getTableLogs = await request(app.getHttpServer())
            .get(`/logs/${connectionIds.firstId}`)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getRowInTableRO = JSON.parse(getTableLogs.text);

          expect(getRowInTableRO.logs.length).toBe(1);
          expect(getRowInTableRO.logs[0].hasOwnProperty('table_name')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('received_data')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('old_data')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('cognitoUserName')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('email')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('operationType')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('operationStatusResult')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('createdAt')).toBeTruthy();
          expect(getRowInTableRO.logs[0].hasOwnProperty('connection_id')).toBeTruthy();
        });
      });
    });

    //****************************** TABLE SETTINGS CONTROLLER

    describe('Table settings controller', () => {
      describe('GET /settings/', () => {
        it('should return empty table settings when it was not created ', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTableSettings = await request(app.getHttpServer())
            .get(`/settings/?connectionId=${connectionIds.firstId}&tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getTableSettingsRO = JSON.parse(getTableSettings.text);
          expect(getTableSettings.status).toBe(200);
          expect(JSON.stringify(getTableSettingsRO)).toBe(JSON.stringify({}));
        });

        it('should return table settings when it was created ', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.firstId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.firstId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableSettings = await request(app.getHttpServer())
            .get(`/settings/?connectionId=${connectionIds.firstId}&tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getTableSettingsRO = JSON.parse(getTableSettings.text);
          expect(getTableSettings.status).toBe(200);
          expect(getTableSettingsRO.hasOwnProperty('id')).toBeTruthy();
          expect(getTableSettingsRO.table_name).toBe(createTableSettingsDTO.table_name);
          expect(getTableSettingsRO.display_name).toBe(createTableSettingsDTO.display_name);
          expect(JSON.stringify(getTableSettingsRO.search_fields)).toBe(
            JSON.stringify(createTableSettingsDTO.search_fields),
          );
          expect(JSON.stringify(getTableSettingsRO.excluded_fields)).toBe(
            JSON.stringify(createTableSettingsDTO.excluded_fields),
          );
          expect(JSON.stringify(getTableSettingsRO.list_fields)).toBe(
            JSON.stringify(createTableSettingsDTO.list_fields),
          );
          expect(JSON.stringify(getTableSettingsRO.identification_fields)).toBe(JSON.stringify([]));
          expect(getTableSettingsRO.list_per_page).toBe(createTableSettingsDTO.list_per_page);
          expect(getTableSettingsRO.ordering).toBe(createTableSettingsDTO.ordering);
          expect(getTableSettingsRO.ordering_field).toBe(createTableSettingsDTO.ordering_field);
          expect(JSON.stringify(getTableSettingsRO.readonly_fields)).toBe(
            JSON.stringify(createTableSettingsDTO.readonly_fields),
          );
          expect(JSON.stringify(getTableSettingsRO.sortable_by)).toBe(
            JSON.stringify(createTableSettingsDTO.sortable_by),
          );
          expect(JSON.stringify(getTableSettingsRO.autocomplete_columns)).toBe(JSON.stringify([]));
          expect(getTableSettingsRO.connection_id).toBe(connectionIds.firstId);
        });

        it('should throw an exception when you try get settings in connection where you do not have permission ', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.secondId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.firstId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableSettings = await request(app.getHttpServer())
            .get(`/settings/?connectionId=${connectionIds.secondId}&tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getTableSettingsRO = JSON.parse(getTableSettings.text);
          expect(getTableSettings.status).toBe(403);
          expect(getTableSettingsRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });
      });

      describe('POST /settings/', () => {
        it('should throw an exception do not have permission', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.firstId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.firstId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(403);
          expect(JSON.parse(createTableSettingsResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw an exception when you try create settings in connection where you do not have permission', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.secondId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.secondId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(403);

          const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
          expect(createTableSettingsRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });
      });

      describe('PUT /settings/', () => {
        it('should return updated table settings', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.firstId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.firstId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const updateTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.firstId,
            'users',
            ['email'],
            ['id'],
            ['name'],
            50,
            QueryOrderingEnum.ASC,
            'created_at',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const updateTableSettingsResponse = await request(app.getHttpServer())
            .put(`/settings?connectionId=${connectionIds.firstId}&tableName=users`)
            .send(updateTableSettingsDTO)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(updateTableSettingsResponse.status).toBe(403);
          expect(JSON.parse(updateTableSettingsResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw an exception when you try update settings in connection where you do not have permission', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.secondId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.secondId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const updateTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.firstId,
            'users',
            ['email'],
            ['id'],
            ['name'],
            50,
            QueryOrderingEnum.ASC,
            'created_at',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const updateTableSettingsResponse = await request(app.getHttpServer())
            .put(`/settings?connectionId=${connectionIds.secondId}&tableName=users`)
            .send(updateTableSettingsDTO)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(updateTableSettingsResponse.status).toBe(403);
          expect(JSON.parse(updateTableSettingsResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });
      });

      describe('DELETE /settings/', () => {
        it('should return array without deleted table settings', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.firstId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.firstId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const deleteTableSettingsResponse = await request(app.getHttpServer())
            .delete(`/settings/?connectionId=${connectionIds.firstId}&tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');

          expect(deleteTableSettingsResponse.status).toBe(403);
          expect(JSON.parse(deleteTableSettingsResponse.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw an exception when you try delete settings in connection where you do not have permission', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            connectionIds.secondId,
            'users',
            ['id'],
            ['email'],
            ['name'],
            3,
            QueryOrderingEnum.DESC,
            'id',
            ['updated_at'],
            ['created_at'],
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${connectionIds.secondId}&tableName=users`)
            .send(createTableSettingsDTO)
            .set('Cookie', connectionAdminUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const deleteTableSettingsResponse = await request(app.getHttpServer())
            .delete(`/settings/?connectionId=${connectionIds.secondId}&tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const deleteTableSettingsRO = JSON.parse(deleteTableSettingsResponse.text);
          expect(deleteTableSettingsResponse.status).toBe(403);
          expect(deleteTableSettingsRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });
      });
    });

    //****************************** TABLE SETTINGS CONTROLLER

    describe('Table widgets controller', () => {
      describe('GET /widgets/:slug', () => {
        it('should return empty widgets array when widgets not created', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const getTableWidgets = await request(app.getHttpServer())
            .get(`/widgets/${connectionIds.firstId}?tableName=users`)
            .set('Cookie', simpleUserToken)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
          expect(getTableWidgets.status).toBe(200);
          expect(typeof getTableWidgetsRO).toBe('object');
          expect(getTableWidgetsRO.length).toBe(0);
        });

        it('should return array of table widgets for table', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const createTableWidgetResponse = await request(app.getHttpServer())
              .post(`/widget/${connectionIds.firstId}?tableName=users`)
              .send({ widgets: newTableWidgets })
              .set('Content-Type', 'application/json')
              .set('Cookie', connectionAdminUserToken)
              .set('Accept', 'application/json');
            const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
            expect(createTableWidgetResponse.status).toBe(201);

            expect(typeof createTableWidgetRO).toBe('object');
            expect(createTableWidgetRO.length).toBe(2);
            expect(createTableWidgetRO[0].widget_type).toBe(newTableWidgets[0].widget_type);
            expect(createTableWidgetRO[1].field_name).toBe(newTableWidgets[1].field_name);
            expect(createTableWidgetRO[0].name).toBe(newTableWidgets[0].name);
            expect(uuidRegex.test(createTableWidgetRO[1].id)).toBeTruthy();

            const getTableWidgets = await request(app.getHttpServer())
              .get(`/widgets/${connectionIds.firstId}?tableName=users`)
              .set('Content-Type', 'application/json')
              .set('Cookie', simpleUserToken)
              .set('Accept', 'application/json');
            expect(getTableWidgets.status).toBe(200);
            const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
            expect(typeof getTableWidgetsRO).toBe('object');
            expect(getTableWidgetsRO.length).toBe(2);
            expect(uuidRegex.test(getTableWidgetsRO[0].id)).toBeTruthy();
            expect(getTableWidgetsRO[0].field_name).toBe(newTableWidgets[0].field_name);
            expect(getTableWidgetsRO[1].widget_type).toBe(newTableWidgets[1].widget_type);
            expect(
              compareArrayElements(getTableWidgetsRO[1].widget_params, newTableWidgets[1].widget_params),
            ).toBeTruthy();

            const getTableStructureResponse = await request(app.getHttpServer())
              .get(`/table/structure/${connectionIds.firstId}?tableName=users`)
              .set('Content-Type', 'application/json')
              .set('Cookie', simpleUserToken)
              .set('Accept', 'application/json');
            expect(getTableStructureResponse.status).toBe(200);
            const getTableStructureRO = JSON.parse(getTableStructureResponse.text);
            expect(getTableStructureRO.hasOwnProperty('table_widgets')).toBeTruthy();
            expect(getTableStructureRO.table_widgets.length).toBe(2);
            expect(getTableStructureRO.table_widgets[0].field_name).toBe(newTableWidgets[0].field_name);
            expect(getTableStructureRO.table_widgets[1].widget_type).toBe(newTableWidgets[1].widget_type);
            expect(
              compareArrayElements(
                getTableStructureRO.table_widgets[0].widget_params,
                newTableWidgets[0].widget_params,
              ),
            ).toBeTruthy();
          } catch (err) {
            throw err;
          }
        });

        it('should throw an exception, when you try to get widgets from connection, when you do not have permissions', async () => {
          try {
            const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
            const createTableWidgetResponse = await request(app.getHttpServer())
              .post(`/widget/${connectionIds.firstId}?tableName=users`)
              .send({ widgets: newTableWidgets })
              .set('Content-Type', 'application/json')
              .set('Cookie', connectionAdminUserToken)
              .set('Accept', 'application/json');
            const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
            expect(createTableWidgetResponse.status).toBe(201);

            expect(typeof createTableWidgetRO).toBe('object');
            expect(createTableWidgetRO.length).toBe(2);
            expect(createTableWidgetRO[0].widget_type).toBe(newTableWidgets[0].widget_type);
            expect(createTableWidgetRO[1].field_name).toBe(newTableWidgets[1].field_name);
            expect(createTableWidgetRO[0].name).toBe(newTableWidgets[0].name);
            expect(uuidRegex.test(createTableWidgetRO[1].id)).toBeTruthy();

            const getTableWidgets = await request(app.getHttpServer())
              .get(`/widgets/${connectionIds.secondId}?tableName=users`)
              .set('Content-Type', 'application/json')
              .set('Cookie', simpleUserToken)
              .set('Accept', 'application/json');
            const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
            expect(getTableWidgets.status).toBe(403);
            expect(getTableWidgetsRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
          } catch (err) {
            throw err;
          }
        });
      });

      describe('POST /widget/:slug', () => {
        it('should throw an exception do not have permissions', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableWidgetResponse = await request(app.getHttpServer())
            .post(`/widget/${connectionIds.firstId}?tableName=users`)
            .send({ widgets: newTableWidgets })
            .set('Content-Type', 'application/json')
            .set('Cookie', simpleUserToken)
            .set('Accept', 'application/json');
          const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
          expect(createTableWidgetResponse.status).toBe(403);
          expect(createTableWidgetRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });

        it('should throw an exception, when you try add widget in connection, when you do not have permissions', async () => {
          const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

          const createTableWidgetResponse = await request(app.getHttpServer())
            .post(`/widget/${connectionIds.secondId}?tableName=users`)
            .send(newTableWidget)
            .set('Content-Type', 'application/json')
            .set('Cookie', simpleUserToken)
            .set('Accept', 'application/json');
          const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
          expect(createTableWidgetResponse.status).toBe(403);
          expect(createTableWidgetRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        });
      });
    });
  });
});
