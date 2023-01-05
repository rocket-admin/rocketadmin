import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { ApplicationModule } from '../../src/app.module';
import { AccessLevelEnum } from '../../src/enums';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter';
import { Messages } from '../../src/exceptions/text/messages';
import { Cacher } from '../../src/helpers/cache/cacher';
import { Constants } from '../../src/helpers/constants/constants';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { TestUtils } from '../utils/test.utils';
import { createConnectionsAndInviteNewUserInNewGroupInFirstConnection } from '../utils/user-with-different-permissions-utils';

let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  app.getHttpServer().listen(0);
  testUtils = moduleFixture.get<TestUtils>(TestUtils);
  await testUtils.resetDb();
});

test.after.always('Close app connection', async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('user table only permissions e2e tests ' + e);
  }
});

/* Table controller */
currentTest = 'GET /connection/tables/:slug';

test(`${currentTest} should return all tables in connection`, async (t) => {
  const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

  const getTablesInConnection = await request(app.getHttpServer())
    .get(`/connection/tables/${testData.connections.firstId}`)
    .set('Cookie', testData.users.simpleUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
  t.is(getTablesInConnection.status, 200);
  t.is(getTablesInConnectionRO.length, 1);
  t.is(getTablesInConnectionRO[0].table, testData.firstTableInfo.testTableName);
  t.is(typeof getTablesInConnectionRO[0].permissions, 'object');
  const { visibility, readonly, add, delete: del, edit } = getTablesInConnectionRO[0].permissions;
  t.is(visibility, testData.permissions.table.add);
  t.is(readonly, testData.permissions.table.readonly);
  t.is(del, testData.permissions.table.delete);
  t.is(edit, testData.permissions.table.edit);
  t.is(add, testData.permissions.table.add);
});

test(`${currentTest} should throw an exception, when connection id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception, when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const fakeConnectionId = faker.datatype.uuid();
    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/${fakeConnectionId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    t.is(getTablesInConnectionRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'GET /table/rows/:slug';

test(`${currentTest} should return found rows from table`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const getTableRows = await request(app.getHttpServer())
      .get(`/table/rows/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableRowsRO = JSON.parse(getTableRows.text);
    t.is(getTableRows.status, 200);
    const { rows, primaryColumns, pagination, sortable_by, structure, foreignKeys } = getTableRowsRO;
    t.is(rows.length, Constants.DEFAULT_PAGINATION.perPage);
    t.is(primaryColumns.length, 1);
    t.is(primaryColumns[0].column_name, 'id');
    t.is(primaryColumns[0].data_type, 'integer');
    t.is(sortable_by.length, 0);
    t.is(structure.length, 5);
    t.is(foreignKeys.length, 0);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const getTablesRows = await request(app.getHttpServer())
      .get(`/table/rows/?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesRows.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const fakeId = faker.datatype.uuid();
    const getTableRows = await request(app.getHttpServer())
      .get(`/table/rows/${fakeId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRows.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTableRows.text);
    t.is(getTablesInConnectionRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const fakeTableName = faker.random.words(1);
    const getTablesRows = await request(app.getHttpServer())
      .get(`/table/rows/${testData.connections.firstId}?tableName=${fakeTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesRows.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTablesRows.text);
    t.is(getTablesInConnectionRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'GET /table/structure/:slug';

test(`${currentTest} should return table structure`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructure.status, 200);
    const { structure, primaryColumns, foreignKeys, readonly_fields, table_widgets } = getTableStructureRO;
    t.is(structure.length, 5);
    t.is(primaryColumns.length, 1);
    t.is(primaryColumns[0].column_name, 'id');
    t.is(primaryColumns[0].data_type, 'integer');
    t.is(readonly_fields.length, 0);
    t.is(table_widgets.length, 0);
    t.is(foreignKeys.length, 0);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const fakeConnectionId = faker.datatype.uuid();
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${fakeConnectionId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when table name not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${testData.connections.firstId}?tableName=`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.TABLE_NAME_MISSING);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const fakeTableName = faker.random.words(1);
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${testData.connections.firstId}?tableName=${fakeTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'POST /table/row/:slug';

test(`${currentTest} should return added row`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const randomName = faker.name.firstName();
    const randomEmail = faker.internet.email();
    /* eslint-disable */
    const created_at = new Date();
    const updated_at = new Date();
    const {
      firstTableInfo: { testTableColumnName, testTableSecondColumnName },
    } = testData;
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({
        [testTableColumnName]: randomName,
        [testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTable.status, 201);
    t.is(addRowInTableRO.row.hasOwnProperty('id'), true);
    t.is(addRowInTableRO.row[testTableColumnName], randomName);
    t.is(addRowInTableRO.row[testTableSecondColumnName], randomEmail);
    t.is(addRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(addRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(addRowInTableRO.hasOwnProperty('structure'), true);
    t.is(addRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(addRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(addRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw exception, when you do not have add permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.none,
      },
      group: {
        groupId: testData.groups.firstAdminGroupId,
        accessLevel: AccessLevelEnum.none,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
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
      .put(`/permissions/${testData.groups.firstAdminGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const randomName = faker.name.firstName();
    const randomEmail = faker.internet.email();
    /* eslint-disable */
    const created_at = new Date();
    const updated_at = new Date();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({
        name: randomName,
        email: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTable.status, 403);
    t.is(addRowInTableRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'PUT /table/row/:slug';

test(`${currentTest} should return updated row`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.none,
      },
      group: {
        groupId: testData.groups.firstAdminGroupId,
        accessLevel: AccessLevelEnum.none,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
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
      .put(`/permissions/${testData.groups.firstAdminGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const randomName = faker.name.firstName();
    const randomEmail = faker.internet.email();
    /* eslint-disable */
    const created_at = new Date();
    const updated_at = new Date();
    const {
      firstTableInfo: { testTableColumnName, testTableSecondColumnName },
    } = testData;
    const updateRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=1`)
      .send({
        [testTableColumnName]: randomName,
        [testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const updateRowInTableRO = JSON.parse(updateRowInTable.text);
    t.is(updateRowInTable.status, 200);
    t.is(updateRowInTableRO.row.hasOwnProperty('id'), true);
    t.is(updateRowInTableRO.row[testTableColumnName], randomName);
    t.is(updateRowInTableRO.row[testTableSecondColumnName], randomEmail);
    t.is(updateRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(updateRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(updateRowInTableRO.hasOwnProperty('structure'), true);
    t.is(updateRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(updateRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(updateRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception do not have permission, when you do not have edit permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);
    const {
      firstTableInfo: { testTableColumnName, testTableSecondColumnName },
    } = testData;
    const randomName = faker.name.firstName();
    const randomEmail = faker.internet.email();
    /* eslint-disable */
    const created_at = new Date();
    const updated_at = new Date();

    const updateRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=2`)
      .send({
        name: randomName,
        email: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(updateRowInTable.text);
    t.is(updateRowInTable.status, 403);
    t.is(addRowInTableRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'DELETE /table/row/:slug';
test(`${currentTest} should return delete result`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=1`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(deleteRowInTable.status, 200);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception, when you do not have delete permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.none,
      },
      group: {
        groupId: testData.groups.firstAdminGroupId,
        accessLevel: AccessLevelEnum.none,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
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
      .put(`/permissions/${testData.groups.firstAdminGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    /* eslint-disable */
    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=1`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(deleteRowInTable.status, 403);
    t.is(JSON.parse(deleteRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'GET /table/row/:slug';

test(`${currentTest} should return row`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const getRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=5`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getRowInTableRO = JSON.parse(getRowInTable.text);
    t.is(getRowInTable.status, 200);
    t.is(getRowInTableRO.row.id, 5);
    t.is(getRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(getRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(getRowInTableRO.hasOwnProperty('structure'), true);
    t.is(getRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(getRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(getRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception do not have permission, when you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupInFirstConnection(app);

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.none,
      },
      group: {
        groupId: testData.groups.firstAdminGroupId,
        accessLevel: AccessLevelEnum.none,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
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
      .put(`/permissions/${testData.groups.firstAdminGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=5`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getRowInTableRO = JSON.parse(getRowInTable.text);
    t.is(getRowInTable.status, 403);
    t.is(getRowInTableRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
    throw e;
  }
});
