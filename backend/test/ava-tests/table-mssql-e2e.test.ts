import { MockFactory } from '../mock.factory';
import { INestApplication } from '@nestjs/common';
import { TestUtils } from '../utils/test.utils';
import test from 'ava';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter';
import { registerUserAndReturnUserInfo } from '../utils/register-user-and-return-user-info';
import { createTestTable } from '../utils/create-test-table';
import { getTestData } from '../utils/get-test-data';
import * as request from 'supertest';
import { dropTestTables } from '../utils/drop-test-tables';
import { faker } from '@faker-js/faker';
import { Messages } from '../../src/exceptions/text/messages';
import { Constants } from '../../src/helpers/constants/constants';
import { QueryOrderingEnum } from '../../src/enums';
import { Connection } from 'typeorm';
import { Cacher } from '../../src/helpers/cache/cacher';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let connectionToTestMSSQL;
let connectionToTestMSSQLProperties;
let testTableName: string;
const testTableColumnName = 'name';
const testTAbleSecondColumnName = 'email';
const testSearchedUserName = 'Vasia';
const testEntitiesSeedsCount = 42;
const testTables: Array<string> = [];
let currentTest;

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
    const connect = await app.get(Connection);
    await testUtils.shutdownServer(app.getHttpAdapter());
    if (connect.isConnected) {
      await connect.close();
    }
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
});

test.after('Drop test tables', async () => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    await dropTestTables(testTables, connectionToTestMSSQL);
  } catch (e) {}
});

currentTest = 'GET /connection/tables/:slug';

test(`${currentTest} should return list of tables in connection`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const getTablesResponse = await request(app.getHttpServer())
      .get(`/connection/tables/${createConnectionRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesResponse.status, 200);
    const getTablesRO = JSON.parse(getTablesResponse.text);

    t.is(typeof getTablesRO, 'object');
    t.is(getTablesRO.length > 0, true);

    const testTableIndex = getTablesRO.findIndex((t) => t.table === testTableName);

    t.is(getTablesRO[testTableIndex].hasOwnProperty('table'), true);
    t.is(getTablesRO[testTableIndex].hasOwnProperty('permissions'), true);
    t.is(typeof getTablesRO[testTableIndex].permissions, 'object');
    t.is(Object.keys(getTablesRO[testTableIndex].permissions).length, 5);
    t.is(getTablesRO[testTableIndex].table, testTableName);
    t.is(getTablesRO[testTableIndex].permissions.visibility, true);
    t.is(getTablesRO[testTableIndex].permissions.readonly, false);
    t.is(getTablesRO[testTableIndex].permissions.add, true);
    t.is(getTablesRO[testTableIndex].permissions.delete, true);
    t.is(getTablesRO[testTableIndex].permissions.edit, true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when connectionId not passed in request`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    createConnectionRO.id = '';
    const getTablesResponse = await request(app.getHttpServer())
      .get(`/connection/tables/${createConnectionRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesResponse.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an error when connection id is incorrect`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);
    createConnectionRO.id = faker.datatype.uuid();
    const getTablesResponse = await request(app.getHttpServer())
      .get(`/connection/tables/${createConnectionRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesResponse.status, 400);
    const { message } = JSON.parse(getTablesResponse.text);
    t.is(message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

currentTest = 'GET /table/rows/:slug';

test(`${currentTest} should return rows of selected table without search and without pagination`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, Constants.DEFAULT_PAGINATION.perPage);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].hasOwnProperty('id'), true);
    t.is(getTableRowsRO.rows[1].hasOwnProperty(testTableColumnName), true);
    t.is(getTableRowsRO.rows[10].hasOwnProperty(testTableSecondColumnName), true);
    t.is(getTableRowsRO.rows[15].hasOwnProperty('created_at'), true);
    t.is(getTableRowsRO.rows[19].hasOwnProperty('updated_at'), true);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should return rows of selected table with search and without pagination`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      ['id'],
      undefined,
      undefined,
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createTableSettingsResponse.status, 201);

    const searchedDescription = '5';

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${searchedDescription}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 1);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);
    t.is(getTableRowsRO.rows[0].id, parseInt(searchedDescription));
    t.is(getTableRowsRO.rows[0].hasOwnProperty(testTableColumnName), true);
    t.is(getTableRowsRO.rows[0].hasOwnProperty(testTableSecondColumnName), true);
    t.is(getTableRowsRO.rows[0].hasOwnProperty('created_at'), true);
    t.is(getTableRowsRO.rows[0].hasOwnProperty('updated_at'), true);
    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should return page of all rows with pagination page=1, perPage=2`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      ['id'],
      undefined,
      undefined,
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2`)
      .set('Content-Type', 'application/json')
      .set('Cookie', firstUserToken)
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].hasOwnProperty('id'), true);
    t.is(getTableRowsRO.rows[1].hasOwnProperty(testTableColumnName), true);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
    t.is(getTableRowsRO.primaryColumns[0].data_type, 'int');

    t.is(getTableRowsRO.pagination.total, 42);
    t.is(getTableRowsRO.pagination.lastPage, 21);
    t.is(getTableRowsRO.pagination.perPage, 2);
    t.is(getTableRowsRO.pagination.currentPage, 1);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should return page of all rows with pagination page=3, perPage=2`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      ['id'],
      undefined,
      undefined,
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=3&perPage=2`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].hasOwnProperty('id'), true);
    t.is(getTableRowsRO.rows[1].hasOwnProperty(testTableColumnName), true);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
    t.is(getTableRowsRO.primaryColumns[0].data_type, 'int');

    t.is(getTableRowsRO.pagination.total, 42);
    t.is(getTableRowsRO.pagination.lastPage, 21);
    t.is(getTableRowsRO.pagination.perPage, 2);
    t.is(getTableRowsRO.pagination.currentPage, 3);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination, without sorting
should return all found rows with pagination page=1 perPage=2`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);
    t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
    t.is(getTableRowsRO.primaryColumns[0].data_type, 'int');

    t.is(getTableRowsRO.pagination.total, 3);
    t.is(getTableRowsRO.pagination.lastPage, 2);
    t.is(getTableRowsRO.pagination.perPage, 2);
    t.is(getTableRowsRO.pagination.currentPage, 1);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination, without sorting
should return all found rows with pagination page=1 perPage=3`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);
    t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
    t.is(getTableRowsRO.primaryColumns[0].data_type, 'int');

    t.is(getTableRowsRO.pagination.total, 3);
    t.is(getTableRowsRO.pagination.lastPage, 2);
    t.is(getTableRowsRO.pagination.perPage, 2);
    t.is(getTableRowsRO.pagination.currentPage, 1);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} without search and without pagination and with sorting
should return all found rows with sorting ids by DESC`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      42,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 42);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 42);
    t.is(getTableRowsRO.rows[1].id, 41);
    t.is(getTableRowsRO.rows[41].id, 1);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} without search and without pagination and with sorting
should return all found rows with sorting ids by ASC`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      42,
      QueryOrderingEnum.ASC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 42);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 1);
    t.is(getTableRowsRO.rows[1].id, 2);
    t.is(getTableRowsRO.rows[41].id, 42);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} without search and with pagination and with sorting
should return all found rows with sorting ports by DESC and with pagination page=1, perPage=2`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 42);
    t.is(getTableRowsRO.rows[1].id, 41);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should return all found rows with sorting ports by ASC and with pagination page=1, perPage=2`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.ASC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 1);
    t.is(getTableRowsRO.rows[1].id, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should return all found rows with sorting ports by DESC and with pagination page=2, perPage=3`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=3`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 3);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 39);
    t.is(getTableRowsRO.rows[1].id, 38);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2&search=${testSearchedUserName}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 38);
    t.is(getTableRowsRO.rows[1].id, 22);
    t.is(getTableRowsRO.pagination.currentPage, 1);
    t.is(getTableRowsRO.pagination.perPage, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 1);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 1);
    t.is(getTableRowsRO.pagination.currentPage, 2);
    t.is(getTableRowsRO.pagination.perPage, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=1, perPage=2 and ASC sorting`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.ASC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2&search=${testSearchedUserName}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 1);
    t.is(getTableRowsRO.rows[1].id, 22);
    t.is(getTableRowsRO.pagination.currentPage, 1);
    t.is(getTableRowsRO.pagination.perPage, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=2, perPage=2 and ASC sorting`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.ASC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 1);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);
    t.is(getTableRowsRO.rows[0].id, 38);
    t.is(getTableRowsRO.pagination.currentPage, 2);
    t.is(getTableRowsRO.pagination.perPage, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination, with sorting and with filtering
should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting and filtering`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldvalue}`,
      )
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 2);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);

    t.is(getTableRowsRO.rows[0].name, testSearchedUserName);
    t.is(getTableRowsRO.rows[0].id, 38);
    t.is(getTableRowsRO.rows[1].name, testSearchedUserName);
    t.is(getTableRowsRO.rows[1].id, 22);

    t.is(getTableRowsRO.pagination.currentPage, 1);
    t.is(getTableRowsRO.pagination.perPage, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination, with sorting and with filtering
should return all found rows with search, pagination: page=1, perPage=10 and DESC sorting and filtering'`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '41';
    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=10&f_${fieldname}__lt=${fieldvalue}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 3);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);

    t.is(getTableRowsRO.rows[0].name, testSearchedUserName);
    t.is(getTableRowsRO.rows[0].id, 38);
    t.is(getTableRowsRO.rows[1].name, testSearchedUserName);
    t.is(getTableRowsRO.rows[1].id, 22);
    t.is(getTableRowsRO.rows[2].name, testSearchedUserName);
    t.is(getTableRowsRO.rows[2].id, 1);

    t.is(getTableRowsRO.pagination.currentPage, 1);
    t.is(getTableRowsRO.pagination.perPage, 10);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination, with sorting and with filtering
should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting and filtering`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '41';
    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=2&perPage=2&f_${fieldname}__lt=${fieldvalue}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 1);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);

    t.is(getTableRowsRO.rows[0].name, testSearchedUserName);
    t.is(getTableRowsRO.rows[0].id, 1);

    t.is(getTableRowsRO.pagination.currentPage, 2);
    t.is(getTableRowsRO.pagination.perPage, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} with search, with pagination, with sorting and with filtering
should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting and with multi filtering`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = 'id';
    const fieldGtvalue = '25';
    const fieldLtvalue = '40';

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 1);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 5);

    t.is(getTableRowsRO.rows[0].id, 38);
    t.is(getTableRowsRO.rows[0].name, testSearchedUserName);

    t.is(getTableRowsRO.pagination.currentPage, 1);
    t.is(getTableRowsRO.pagination.perPage, 2);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id is not passed in request`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = 'id';
    const fieldGtvalue = '25';
    const fieldLtvalue = '40';
    createConnectionRO.id = '';
    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = 'id';
    const fieldGtvalue = '25';
    const fieldLtvalue = '40';

    createConnectionRO.id = faker.datatype.uuid();
    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 400);

    const { message } = JSON.parse(getTableRowsResponse.text);

    t.is(message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = 'id';
    const fieldGtvalue = '25';
    const fieldLtvalue = '40';

    const fakeTableName = faker.random.words(1);
    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 400);

    const { message } = JSON.parse(getTableRowsResponse.text);

    t.is(message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should return an array with searched fields when filtered name passed in request is incorrect`, async (t) => {
  try {
    const { connectionToTestMSSQL } = getTestData(mockFactory);
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestMSSQL);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestMSSQL)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      createConnectionRO.id,
      testTableName,
      [testTableColumnName],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'id',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const fieldname = faker.random.words(1);
    const fieldGtvalue = '25';
    const fieldLtvalue = '40';

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTablesRO = JSON.parse(getTableRowsResponse.text);
    t.is(getTablesRO.rows.length, 2);
    t.is(getTablesRO.rows[0].name, testSearchedUserName);
    t.is(getTablesRO.rows[1].name, testSearchedUserName);
    t.is(getTablesRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTablesRO.hasOwnProperty('pagination'), true);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

// test(`${currentTest} should return list of tables in connection`, async (t) => {
//   const { connectionToTestMSSQL } = getTestData(mockFactory);
//   const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
//   const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
//     await createTestTable(connectionToTestMSSQL);
//
//   testTables.push(testTableName);
//
//   const createConnectionResponse = await request(app.getHttpServer())
//     .post('/connection')
//     .send(connectionToTestMSSQL)
//     .set('Content-Type', 'application/json')
//     .set('Accept', 'application/json');
//   const createConnectionRO = JSON.parse(createConnectionResponse.text);
//   t.is(createConnectionResponse.status, 201);
// });
//
