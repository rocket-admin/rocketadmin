import { faker } from '@faker-js/faker';
import { knex } from 'knex';
import * as request from 'supertest';
import { AccessLevelEnum } from '../../src/enums.js';
import { ApplicationModule } from '../../src/app.module.js';
import { Connection } from 'typeorm';
import { Constants } from '../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../../src/exceptions/text/messages.js';
import { MockFactory } from '../mock.factory.js';
import { Test } from '@nestjs/testing';
import { TestUtils } from '../utils/test.utils.js';
import * as cookieParser from 'cookie-parser';
import { Cacher } from '../../src/helpers/cache/cacher.js';
// yarn jest user-different-table-only-permissions.e2e.spec.ts
describe('User permissions (connection none, group none) (e2e)', () => {
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
  let simpleUserToken;
  let newTableWidget;
  let newRandomGroup2;
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
          [testTableColumnName]: faker.name.firstName(),
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    await Knex.destroy();
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  beforeAll(async () => {
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
    await resetPostgresTestDB();

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
    await Cacher.clearAllCache();
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
  /*
  async function createAdminConnections() {
    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse.status).toBe(200);

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
*/
  async function createConnectionsAndInviteNewUserInNewGroupInFirstConnection() {
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
        accessLevel: AccessLevelEnum.none,
      },
      group: {
        groupId: groupId,
        accessLevel: AccessLevelEnum.none,
      },
      tables: [
        {
          tableName: testTableName,
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

  describe('Table controller', () => {
    describe('GET /connection/tables/:slug', () => {
      it('should return all tables in connection', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const getTablesInConnection = await request(app.getHttpServer())
          .get(`/connection/tables/${connectionIds.firstId}`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
        expect(getTablesInConnection.status).toBe(200);
        expect(getTablesInConnectionRO.length).toBe(1);
        expect(getTablesInConnectionRO[0].table).toBe(testTableName);
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

        const fakeConnectionId = faker.datatype.uuid();
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
          .get(`/table/rows/${connectionIds.firstId}?tableName=${testTableName}`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const getTableRowsRO = JSON.parse(getTableRows.text);
        expect(getTableRows.status).toBe(200);
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
          .get(`/table/rows/?tableName=${testTableName}`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTablesRows.status).toBe(404);
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        const fakeId = faker.datatype.uuid();
        const getTableRows = await request(app.getHttpServer())
          .get(`/table/rows/${fakeId}?tableName=${testTableName}`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRows.status).toBe(400);
        const getTablesInConnectionRO = JSON.parse(getTableRows.text);
        expect(getTablesInConnectionRO.message).toBe(Messages.CONNECTION_NOT_FOUND);
      });

      it('should throw an exception when table name passed in request is incorrect', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const fakeTableName = faker.random.words(1);
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
          .get(`/table/structure/${connectionIds.firstId}?tableName=${testTableName}`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const getTableStructureRO = JSON.parse(getTablesStructure.text);
        expect(getTablesStructure.status).toBe(200);
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
          .get(`/table/structure/?tableName=${testTableName}`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTablesStructure.status).toBe(404);
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const fakeConnectionId = faker.datatype.uuid();
        const getTablesStructure = await request(app.getHttpServer())
          .get(`/table/structure/${fakeConnectionId}?tableName=${testTableName}`)
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

        const fakeTableName = faker.random.words(1);
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

        const randomName = faker.name.firstName();
        const randomEmail = faker.name.firstName();
        /* eslint-disable */
        const created_at = new Date();
        const updated_at = new Date();
        const addRowInTable = await request(app.getHttpServer())
          .post(`/table/row/${connectionIds.firstId}?tableName=${testTableName}`)
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

      it('should throw exception, when you do not have add permission', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();
        const permissions = {
          connection: {
            connectionId: connectionIds.firstId,
            accessLevel: AccessLevelEnum.none,
          },
          group: {
            groupId: connectionIds.firstAdminGroupId,
            accessLevel: AccessLevelEnum.none,
          },
          tables: [
            {
              tableName: testTableName,
              accessLevel: {
                visibility: true,
                readonly: false,
                add: false,
                delete: true,
                edit: false,
              },
            },
          ],
        };

        const createOrUpdatePermissionResponse = await request(app.getHttpServer())
          .put(`/permissions/${connectionIds.firstAdminGroupId}`)
          .send({ permissions })
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const randomName = faker.name.firstName();
        const randomEmail = faker.name.firstName();
        /* eslint-disable */
        const created_at = new Date();
        const updated_at = new Date();
        const addRowInTable = await request(app.getHttpServer())
          .post(`/table/row/${connectionIds.firstId}?tableName=${testTableName}`)
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
        expect(addRowInTable.status).toBe(403);
        expect(addRowInTableRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);

        /* eslint-enable */
      });
    });

    describe('PUT /table/row/:slug', () => {
      it('should return updated row', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const permissions = {
          connection: {
            connectionId: connectionIds.firstId,
            accessLevel: AccessLevelEnum.none,
          },
          group: {
            groupId: connectionIds.firstAdminGroupId,
            accessLevel: AccessLevelEnum.none,
          },
          tables: [
            {
              tableName: testTableName,
              accessLevel: {
                visibility: true,
                readonly: false,
                add: false,
                delete: true,
                edit: true,
              },
            },
          ],
        };

        const createOrUpdatePermissionResponse = await request(app.getHttpServer())
          .put(`/permissions/${connectionIds.firstAdminGroupId}`)
          .send({ permissions })
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const randomName = faker.name.firstName();
        const randomEmail = faker.name.firstName();
        /* eslint-disable */
        const created_at = new Date();
        const updated_at = new Date();
        const updateRowInTable = await request(app.getHttpServer())
          .put(`/table/row/${connectionIds.firstId}?tableName=${testTableName}&id=1`)
          .send({
            name: randomName,
            email: randomEmail,
            created_at: created_at,
            updated_at: updated_at,
          })
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const updateRowInTableRO = JSON.parse(updateRowInTable.text);
        expect(updateRowInTable.status).toBe(200);
        expect(updateRowInTableRO.row.hasOwnProperty('id')).toBeTruthy();
        expect(updateRowInTableRO.row.name).toBe(randomName);
        expect(updateRowInTableRO.row.email).toBe(randomEmail);
        expect(updateRowInTableRO.row.hasOwnProperty('created_at')).toBeTruthy();
        expect(updateRowInTableRO.row.hasOwnProperty('updated_at')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('structure')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('foreignKeys')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('readonly_fields')).toBeTruthy();
        /* eslint-enable */
      });

      it('should throw an exception do not have permission, when you do not have edit permission ', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const randomName = faker.name.firstName();
        const randomEmail = faker.name.firstName();
        /* eslint-disable */
        const created_at = new Date();
        const updated_at = new Date();

        const updateRowInTable = await request(app.getHttpServer())
          .put(`/table/row/${connectionIds.firstId}?tableName=${testTableName}&id=2`)
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
    });

    describe('DELETE /table/row/:slug', () => {
      it('should return delete result', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        /* eslint-disable */
        const deleteRowInTable = await request(app.getHttpServer())
          .delete(`/table/row/${connectionIds.firstId}?tableName=${testTableName}&id=1`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(deleteRowInTable.status).toBe(200);
        /* eslint-enable */
      });

      it('should throw an exception, when you do not have delete permission', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const permissions = {
          connection: {
            connectionId: connectionIds.firstId,
            accessLevel: AccessLevelEnum.none,
          },
          group: {
            groupId: connectionIds.firstAdminGroupId,
            accessLevel: AccessLevelEnum.none,
          },
          tables: [
            {
              tableName: testTableName,
              accessLevel: {
                visibility: true,
                readonly: false,
                add: true,
                delete: false,
                edit: true,
              },
            },
          ],
        };

        const createOrUpdatePermissionResponse = await request(app.getHttpServer())
          .put(`/permissions/${connectionIds.firstAdminGroupId}`)
          .send({ permissions })
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        /* eslint-disable */
        const deleteRowInTable = await request(app.getHttpServer())
          .delete(`/table/row/${connectionIds.firstId}?tableName=${testTableName}&id=1`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(deleteRowInTable.status).toBe(403);
        expect(JSON.parse(deleteRowInTable.text).message).toBe(Messages.DONT_HAVE_PERMISSIONS);
        /* eslint-enable */
      });
    });

    describe('GET /table/row/:slug', () => {
      it('should return row', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const getRowInTable = await request(app.getHttpServer())
          .get(`/table/row/${connectionIds.firstId}?tableName=${testTableName}&id=5`)
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

      it('should throw an exception do not have permission, when you do not have permission', async () => {
        const connectionIds = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection();

        const permissions = {
          connection: {
            connectionId: connectionIds.firstId,
            accessLevel: AccessLevelEnum.none,
          },
          group: {
            groupId: connectionIds.firstAdminGroupId,
            accessLevel: AccessLevelEnum.none,
          },
          tables: [
            {
              tableName: testTableName,
              accessLevel: {
                visibility: false,
                readonly: true,
                add: false,
                delete: false,
                edit: false,
              },
            },
          ],
        };

        const createOrUpdatePermissionResponse = await request(app.getHttpServer())
          .put(`/permissions/${connectionIds.firstAdminGroupId}`)
          .send({ permissions })
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const getRowInTable = await request(app.getHttpServer())
          .get(`/table/row/${connectionIds.firstId}?tableName=${testTableName}&id=5`)
          .set('Cookie', simpleUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const getRowInTableRO = JSON.parse(getRowInTable.text);
        expect(getRowInTable.status).toBe(403);
        expect(getRowInTableRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      });
    });
  });
});
