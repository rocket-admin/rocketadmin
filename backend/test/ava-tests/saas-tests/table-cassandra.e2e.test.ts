/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path, { join } from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { ApplicationModule } from '../../../src/app.module.js';
import { LogOperationTypeEnum, QueryOrderingEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
const testSearchedUserName = 'Vasia';
const testTables: Array<string> = [];
let currentTest;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication() as any;
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory(validationErrors: ValidationError[] = []) {
        return new ValidationException(validationErrors);
      },
    }),
  );
  await app.init();
  app.getHttpServer().listen(0);
});

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
});

currentTest = 'GET /connection/tables/:slug';

test.serial(`${currentTest} should return list of tables in connection`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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

test.serial(`${currentTest} should throw an error when connectionId not passed in request`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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

test.serial(`${currentTest} should throw an error when connection id is incorrect`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);
    createConnectionRO.id = faker.string.uuid();
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

test.serial(`${currentTest} should return rows of selected table without search and without pagination`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
    t.is(getTableRowsResponse.status, 200);
    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.hasOwnProperty('large_dataset'), true);
    t.is(getTableRowsRO.rows.length, Constants.DEFAULT_PAGINATION.perPage);
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);
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

test.serial(`${currentTest} should return rows of selected table with search and without pagination`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testTableSecondColumnName, insertedSearchedIds } =
      await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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

    const searchedDescription = insertedSearchedIds[0].id;

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${searchedDescription}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
    t.is(getTableRowsResponse.status, 200);
    t.is(typeof getTableRowsRO, 'object');
    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
    t.is(getTableRowsRO.rows.length, 1);
    t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);
    t.is(getTableRowsRO.rows[0].id, searchedDescription);
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

test.serial(`${currentTest} should return page of all rows with pagination page=1, perPage=2`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);
    t.is(getTableRowsRO.rows[0].hasOwnProperty('id'), true);
    t.is(getTableRowsRO.rows[1].hasOwnProperty(testTableColumnName), true);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
    t.is(getTableRowsRO.primaryColumns[0].data_type, 'text');

    t.is(getTableRowsRO.pagination.total, 42);
    t.is(getTableRowsRO.pagination.lastPage, 21);
    t.is(getTableRowsRO.pagination.perPage, 2);
    t.is(getTableRowsRO.pagination.currentPage, 1);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test.serial(`${currentTest} should return page of all rows with pagination page=3, perPage=2`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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
    t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);
    t.is(getTableRowsRO.rows[0].hasOwnProperty('id'), true);
    t.is(getTableRowsRO.rows[1].hasOwnProperty(testTableColumnName), true);

    t.is(typeof getTableRowsRO.primaryColumns, 'object');
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
    t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
    t.is(getTableRowsRO.primaryColumns[0].data_type, 'text');

    t.is(getTableRowsRO.pagination.total, 42);
    t.is(getTableRowsRO.pagination.lastPage, 21);
    t.is(getTableRowsRO.pagination.perPage, 2);
    t.is(getTableRowsRO.pagination.currentPage, 3);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test.serial(
  `${currentTest} with search, with pagination, without sorting
should return all found rows with pagination page=1 perPage=2`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
      t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);
      t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
      t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
      t.is(getTableRowsRO.primaryColumns[0].data_type, 'text');

      t.is(getTableRowsRO.pagination.total, 3);
      t.is(getTableRowsRO.pagination.lastPage, 2);
      t.is(getTableRowsRO.pagination.perPage, 2);
      t.is(getTableRowsRO.pagination.currentPage, 1);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination, without sorting
should return all found rows with pagination page=1 perPage=3`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
      t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);
      t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
      t.is(getTableRowsRO.primaryColumns[0].column_name, 'id');
      t.is(getTableRowsRO.primaryColumns[0].data_type, 'text');

      t.is(getTableRowsRO.pagination.total, 3);
      t.is(getTableRowsRO.pagination.lastPage, 2);
      t.is(getTableRowsRO.pagination.perPage, 2);
      t.is(getTableRowsRO.pagination.currentPage, 1);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} without search and without pagination and with sorting
should return all found rows with sorting ids by DESC`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName, insertedSearchedIds } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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

      const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

      t.is(getTableRowsResponse.status, 200);
      t.is(typeof getTableRowsRO, 'object');
      t.is(getTableRowsRO.hasOwnProperty('rows'), true);
      t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
      t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
      t.is(getTableRowsRO.rows.length, 42);
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);

      const ages = getTableRowsRO.rows.map((row) => row.age);
      for (let i = 0; i < ages.length - 1; i++) {
        t.true(
          ages[i] >= ages[i + 1],
          `Age at index ${i} (${ages[i]}) should be >= age at index ${i + 1} (${ages[i + 1]})`,
        );
      }

      const highestAgeRows = getTableRowsRO.rows.filter((row) => row.age >= 90);
      t.true(highestAgeRows.length >= 2, 'Should have at least 2 rows with age >= 90');
      t.true(
        highestAgeRows.every((row) => row.name === testSearchedUserName),
        'High age rows should have the test user name',
      );

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} without search and without pagination and with sorting
should return all found rows with sorting ids by ASC`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);

      // Check that rows are sorted by age in ascending order
      const ages = getTableRowsRO.rows.map((row) => row.age);
      for (let i = 0; i < ages.length - 1; i++) {
        t.true(
          ages[i] <= ages[i + 1],
          `Age at index ${i} (${ages[i]}) should be <= age at index ${i + 1} (${ages[i + 1]})`,
        );
      }

      // Verify the youngest test user is near the beginning
      const lowestAgeRow = getTableRowsRO.rows.find((row) => row.name === testSearchedUserName && row.age === 14);
      t.truthy(lowestAgeRow, 'Should find the test user with age 14');

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} without search and with pagination and with sorting
should return all found rows with sorting ports by DESC and with pagination page=1, perPage=2`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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

      const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
      t.is(getTableRowsResponse.status, 200);
      t.is(typeof getTableRowsRO, 'object');
      t.is(getTableRowsRO.hasOwnProperty('rows'), true);
      t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
      t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
      t.is(getTableRowsRO.rows.length, 2);
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);

      // Check that rows are sorted by age in descending order
      const ages = getTableRowsRO.rows.map((row) => row.age);
      for (let i = 0; i < ages.length - 1; i++) {
        t.true(
          ages[i] >= ages[i + 1],
          `Age at index ${i} (${ages[i]}) should be >= age at index ${i + 1} (${ages[i + 1]})`,
        );
      }

      // Verify the oldest test user is near the beginning
      const lowestAgeRow = getTableRowsRO.rows.find((row) => row.name === testSearchedUserName && row.age === 90);
      t.truthy(lowestAgeRow, 'Should find the test user with age 90');

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} should return all found rows with sorting age by ASC and with pagination page=1, perPage=2`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);

      const ages = getTableRowsRO.rows.map((row) => row.age);
      for (let i = 0; i < ages.length - 1; i++) {
        t.true(
          ages[i] <= ages[i + 1],
          `Age at index ${i} (${ages[i]}) should be <= age at index ${i + 1} (${ages[i + 1]})`,
        );
      }

      const lowestAgeRow = getTableRowsRO.rows.find((row) => row.name === testSearchedUserName && row.age === 14);
      t.truthy(lowestAgeRow, 'Should find the test user with age 14');

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} should return all found rows with sorting ports by DESC and with pagination page=2, perPage=3`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);

      const ages = getTableRowsRO.rows.map((row) => row.age);
      for (let i = 0; i < ages.length - 1; i++) {
        t.true(
          ages[i] >= ages[i + 1],
          `Age at index ${i} (${ages[i]}) should be >= age at index ${i + 1} (${ages[i + 1]})`,
        );
      }

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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

      const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

      t.is(getTableRowsResponse.status, 200);
      t.is(typeof getTableRowsRO, 'object');
      t.is(getTableRowsRO.hasOwnProperty('rows'), true);
      t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
      t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
      t.is(getTableRowsRO.rows.length, 2);
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);

      t.is(getTableRowsRO.pagination.currentPage, 1);
      t.is(getTableRowsRO.pagination.perPage, 2);

      const ages = getTableRowsRO.rows.map((row) => row.age);
      for (let i = 0; i < ages.length - 1; i++) {
        t.true(
          ages[i] >= ages[i + 1],
          `Age at index ${i} (${ages[i]}) should be >= age at index ${i + 1} (${ages[i + 1]})`,
        );
      }

      const highestAgeRow = getTableRowsRO.rows.find((row) => row.name === testSearchedUserName && row.age === 95);
      t.truthy(highestAgeRow, 'Should find the test user with age 95');

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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
      const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);

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
      t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);
      t.is(getTableRowsRO.rows[0].age, 14);
      t.is(getTableRowsRO.pagination.currentPage, 2);
      t.is(getTableRowsRO.pagination.perPage, 2);

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=1, perPage=2 and ASC sorting`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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
      t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);
      t.is(getTableRowsRO.rows[0].age, 14);
      t.is(getTableRowsRO.rows[1].age, 90);
      t.is(getTableRowsRO.pagination.currentPage, 1);
      t.is(getTableRowsRO.pagination.perPage, 2);

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination and with sorting
should return all found rows with search, pagination: page=2, perPage=2 and ASC sorting`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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
      t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);
      t.is(getTableRowsRO.rows[0].age, 95);
      t.is(getTableRowsRO.pagination.currentPage, 2);
      t.is(getTableRowsRO.pagination.perPage, 2);

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination, with sorting and with filtering
should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting and filtering in body`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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

      const fieldname = 'age';
      const fieldvalue = '80';

      const filters = {
        [fieldname]: { gt: fieldvalue },
      };

      const getTableRowsResponse = await request(app.getHttpServer())
        .post(
          `/table/rows/find/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2`,
        )
        .send({ filters })
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

      t.is(typeof getTableRowsRO, 'object');
      t.is(getTableRowsRO.hasOwnProperty('rows'), true);
      t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
      t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
      t.is(getTableRowsRO.rows.length, 2);
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 6);

      t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
      t.is(getTableRowsRO.rows[0].age, 95);
      t.is(getTableRowsRO.rows[1][testTableColumnName], testSearchedUserName);
      t.is(getTableRowsRO.rows[1].age, 90);

      t.is(getTableRowsRO.pagination.currentPage, 1);
      t.is(getTableRowsRO.pagination.perPage, 2);

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination, with sorting and with filtering
should return all found rows with search, pagination: page=1, perPage=10 and DESC sorting and filtering'`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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

      const fieldname = 'age';
      const fieldvalue = '18';
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
      t.is(getTableRowsRO.rows.length, 1);
      t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);

      t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
      t.is(getTableRowsRO.rows[0].age, 14);

      t.is(getTableRowsRO.pagination.currentPage, 1);
      t.is(getTableRowsRO.pagination.perPage, 10);

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  `${currentTest} with search, with pagination, with sorting and with filtering
should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting and filtering`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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

      const fieldname = 'age';
      const fieldvalue = '96';
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
      t.is(Object.keys(getTableRowsRO.rows[0]).length, 6);

      t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
      t.is(getTableRowsRO.rows[0].age, 14);

      t.is(getTableRowsRO.pagination.currentPage, 2);
      t.is(getTableRowsRO.pagination.perPage, 2);

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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
      'age',
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

    const fieldname = 'age';
    const fieldLtvalue = '96';

    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const getTableRowsResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}`,
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

test.serial(
  `${currentTest} should return an array with searched fields when filtered name passed in request is incorrect`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
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
        'age',
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

      const fieldname = faker.lorem.words(1);
      const fieldLtvalue = '96';

      const getTableRowsResponse = await request(app.getHttpServer())
        .get(
          `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}`,
        )
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(getTableRowsResponse.status, 200);

      const getTablesRO = JSON.parse(getTableRowsResponse.text);
      t.is(getTablesRO.rows.length, 2);
      t.is(getTablesRO.rows[0][testTableColumnName], testSearchedUserName);
      t.is(getTablesRO.rows[1][testTableColumnName], testSearchedUserName);
      t.is(getTablesRO.hasOwnProperty('primaryColumns'), true);
      t.is(getTablesRO.hasOwnProperty('pagination'), true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

currentTest = 'GET /table/structure/:slug';
test.serial(`${currentTest} should return table structure`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const getTableStructure = await request(app.getHttpServer())
    .get(`/table/structure/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableStructure.status, 200);
  const getTableStructureRO = JSON.parse(getTableStructure.text);

  t.is(typeof getTableStructureRO, 'object');
  t.is(typeof getTableStructureRO.structure, 'object');
  t.is(getTableStructureRO.structure.length, 6);

  for (const element of getTableStructureRO.structure) {
    t.is(element.hasOwnProperty('column_name'), true);
    t.is(element.hasOwnProperty('column_default'), true);
    t.is(element.hasOwnProperty('data_type'), true);
    t.is(element.hasOwnProperty('isExcluded'), true);
    t.is(element.hasOwnProperty('isSearched'), true);
  }

  t.is(getTableStructureRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableStructureRO.hasOwnProperty('foreignKeys'), true);

  for (const element of getTableStructureRO.primaryColumns) {
    t.is(element.hasOwnProperty('column_name'), true);
    t.is(element.hasOwnProperty('data_type'), true);
  }

  for (const element of getTableStructureRO.foreignKeys) {
    t.is(element.hasOwnProperty('referenced_column_name'), true);
    t.is(element.hasOwnProperty('referenced_table_name'), true);
    t.is(element.hasOwnProperty('constraint_name'), true);
    t.is(element.hasOwnProperty('column_name'), true);
  }
});

test.serial(`${currentTest} should throw an exception whe connection id not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  createConnectionRO.id = '';
  const getTableStructure = await request(app.getHttpServer())
    .get(`/table/structure/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableStructure.status, 404);
});

test.serial(`${currentTest} should throw an exception whe connection id passed in request id incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  createConnectionRO.id = faker.string.uuid();
  const getTableStructure = await request(app.getHttpServer())
    .get(`/table/structure/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableStructure.status, 403);
  const { message } = JSON.parse(getTableStructure.text);
  t.is(message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest}should throw an exception when tableName not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const tableName = '';
  const getTableStructure = await request(app.getHttpServer())
    .get(`/table/structure/${createConnectionRO.id}?tableName=${tableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableStructure.status, 400);
  const { message } = JSON.parse(getTableStructure.text);
  t.is(message, Messages.TABLE_NAME_MISSING);
});

test.serial(`${currentTest} should throw an exception when tableName passed in request is incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const tableName = faker.lorem.words(1);
  const getTableStructure = await request(app.getHttpServer())
    .get(`/table/structure/${createConnectionRO.id}?tableName=${tableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableStructure.status, 400);

  const responseObject = JSON.parse(getTableStructure.text);
  t.is(responseObject.message, Messages.TABLE_NOT_FOUND);
});

currentTest = 'POST /table/row/:slug';

test.serial(`${currentTest} should add row in table and return result`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const fakeId = faker.string.uuid();
  const row = {
    ['id']: fakeId,
    ['age']: 99,
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };

  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const addRowInTableRO = JSON.parse(addRowInTableResponse.text);
  t.is(addRowInTableResponse.status, 201);

  t.is(addRowInTableRO.hasOwnProperty('row'), true);
  t.is(addRowInTableRO.hasOwnProperty('structure'), true);
  t.is(addRowInTableRO.hasOwnProperty('foreignKeys'), true);
  t.is(addRowInTableRO.hasOwnProperty('primaryColumns'), true);
  t.is(addRowInTableRO.hasOwnProperty('readonly_fields'), true);
  t.is(addRowInTableRO.row[testTableColumnName], row[testTableColumnName]);
  t.is(addRowInTableRO.row[testTableSecondColumnName], row[testTableSecondColumnName]);

  //checking that the line was added
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 43);

  // check that rows adding was logged

  const getLogsResponse = await request(app.getHttpServer())
    .get(`/logs/${createConnectionRO.id}?page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(getLogsResponse.status, 200);
  const getLogsRO = JSON.parse(getLogsResponse.text);
  t.is(getLogsRO.hasOwnProperty('logs'), true);
  t.is(getLogsRO.hasOwnProperty('pagination'), true);
  t.is(getLogsRO.logs.length > 0, true);
  const addRowLogIndex = getLogsRO.logs.findIndex((log) => log.operationType === 'addRow');
  t.is(getLogsRO.logs[addRowLogIndex].hasOwnProperty('affected_primary_key'), true);
  t.is(typeof getLogsRO.logs[addRowLogIndex].affected_primary_key, 'object');
  t.is(getLogsRO.logs[addRowLogIndex].affected_primary_key.hasOwnProperty('id'), true);
  t.is(getLogsRO.logs[addRowLogIndex].affected_primary_key.id, fakeId);
});

test.serial(`${currentTest} should throw an exception when connection id is not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    id: faker.string.uuid(),
    ['age']: 99,
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };
  const fakeConnectionId = '';
  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${fakeConnectionId}?tableName=${testTableName}`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(addRowInTableResponse.status, 404);

  //checking that the line wasn't added
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
});

test.serial(`${currentTest} should throw an exception when table name is not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    id: faker.string.uuid(),
    age: 99,
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };

  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${createConnectionRO.id}?tableName=`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(addRowInTableResponse.status, 400);
  const { message } = JSON.parse(addRowInTableResponse.text);

  t.is(message, Messages.TABLE_NAME_MISSING);

  //checking that the line wasn't added
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
});

test.serial(`${currentTest} should throw an exception when row is not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(addRowInTableResponse.status, 400);
  const { message } = JSON.parse(addRowInTableResponse.text);

  t.is(message, Messages.PARAMETER_MISSING);

  //checking that the line wasn't added
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
});

test.serial(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    id: faker.string.uuid(),
    age: 99,
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };

  const fakeTableName = `${faker.lorem.words(1)}_${faker.number.int({ min: 1, max: 10000 })}`;
  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const { message } = JSON.parse(addRowInTableResponse.text);
  t.is(addRowInTableResponse.status, 400);
  t.is(message, Messages.TABLE_NOT_FOUND);

  //checking that the line wasn't added
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
});

currentTest = 'PUT /table/row/:slug';

test.serial(`${currentTest} should update row in table and return result`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };
  const foundIdForUpdate = insertedSearchedIds[0].id;
  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${foundIdForUpdate}&age=14`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(updateRowInTableResponse.status, 200);
  const updateRowInTableRO = JSON.parse(updateRowInTableResponse.text);

  t.is(updateRowInTableRO.hasOwnProperty('row'), true);
  t.is(updateRowInTableRO.hasOwnProperty('structure'), true);
  t.is(updateRowInTableRO.hasOwnProperty('foreignKeys'), true);
  t.is(updateRowInTableRO.hasOwnProperty('primaryColumns'), true);
  t.is(updateRowInTableRO.hasOwnProperty('readonly_fields'), true);
  t.is(updateRowInTableRO.row[testTableColumnName], row[testTableColumnName]);
  t.is(updateRowInTableRO.row[testTableSecondColumnName], row[testTableSecondColumnName]);

  //checking that the line was updated
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  const updateRowIndex = rows.findIndex((element) => element.id === foundIdForUpdate);
  t.is(rows.length, 42);
  t.is(rows[updateRowIndex][testTableColumnName], row[testTableColumnName]);
  t.is(rows[updateRowIndex][testTableSecondColumnName], row[testTableSecondColumnName]);
});

test.serial(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };
  const foundIdForUpdate = insertedSearchedIds[0].id;
  createConnectionRO.id = '';
  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${foundIdForUpdate}`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(updateRowInTableResponse.status, 404);
});

test.serial(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);
  const foundIdForUpdate = insertedSearchedIds[0].id;
  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);

  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };

  createConnectionRO.id = faker.string.uuid();
  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${foundIdForUpdate}`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(updateRowInTableResponse.status, 403);
  const { message } = JSON.parse(updateRowInTableResponse.text);
  t.is(message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should throw an exception when tableName not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);
  const foundIdForUpdate = insertedSearchedIds[0].id;
  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };

  createConnectionRO.id = faker.string.uuid();
  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=&id=${foundIdForUpdate}`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(updateRowInTableResponse.status, 400);
  const { message } = JSON.parse(updateRowInTableResponse.text);
  t.is(message, Messages.TABLE_NAME_MISSING);
});

test.serial(`${currentTest} should throw an exception when tableName passed in request is incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);
  const foundIdForUpdate = insertedSearchedIds[0].id;
  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };

  const fakeTableName = faker.string.uuid();
  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${foundIdForUpdate}`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(updateRowInTableResponse.status, 400);
  const { message } = JSON.parse(updateRowInTableResponse.text);
  t.is(message, Messages.TABLE_NOT_FOUND);
});

test.serial(`${currentTest} should throw an exception when primary key not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTableSecondColumnName]: fakeMail,
  };

  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&`)
    .send(JSON.stringify(row))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(updateRowInTableResponse.status, 400);
  const { message } = JSON.parse(updateRowInTableResponse.text);
  t.is(message, Messages.PRIMARY_KEY_INVALID);
});

test.serial(
  `${currentTest} should throw an exception when primary key passed in request has incorrect field name`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const {
      testTableName,
      testTableColumnName,
      testEntitiesSeedsCount,
      testTableSecondColumnName,
      insertedSearchedIds,
    } = await createTestTable(connectionToTestDB);
    const foundIdForUpdate = insertedSearchedIds[0].id;
    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fakeName = faker.person.firstName();
    const fakeMail = faker.internet.email();

    const row = {
      [testTableColumnName]: fakeName,
      [testTableSecondColumnName]: fakeMail,
    };

    const updateRowInTableResponse = await request(app.getHttpServer())
      .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&IncorrectField=${foundIdForUpdate}`)
      .send(JSON.stringify(row))
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateRowInTableResponse.status, 400);
    const { message } = JSON.parse(updateRowInTableResponse.text);
    t.is(message, Messages.PRIMARY_KEY_INVALID);
  },
);

test.serial(
  `${currentTest} should throw an exception when primary key passed in request has incorrect field value`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fakeName = faker.person.firstName();
    const fakeMail = faker.internet.email();

    const row = {
      [testTableColumnName]: fakeName,
      [testTableSecondColumnName]: fakeMail,
    };

    const updateRowInTableResponse = await request(app.getHttpServer())
      .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${faker.string.uuid()}&age=14`)
      .send(JSON.stringify(row))
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateRowInTableResponse.status, 400);
    const { message } = JSON.parse(updateRowInTableResponse.text);
    t.is(message, Messages.ROW_PRIMARY_KEY_NOT_FOUND);
  },
);

currentTest = 'PUT /table/rows/update/:connectionId';

test.serial(`${currentTest} should update multiple rows and return result`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const firstIdToUpdate = insertedSearchedIds[0].id;
  const secondIdToUpdate = insertedSearchedIds[1].id;
  const requestData = {
    primaryKeys: [
      { id: firstIdToUpdate, age: 14 },
      { id: secondIdToUpdate, age: 90 },
    ],
    newValues: {
      [testTableColumnName]: fakeName,
      [testTableSecondColumnName]: fakeMail,
    },
  };

  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/rows/update/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(JSON.stringify(requestData))
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const updateRowInTableRO = JSON.parse(updateRowInTableResponse.text);

  t.is(updateRowInTableResponse.status, 200);
  t.is(updateRowInTableRO.success, true);

  // check that the rows were updated
  const firstRowResponse = await request(app.getHttpServer())
    .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${firstIdToUpdate}&age=14`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const firstRow = JSON.parse(firstRowResponse.text);
  t.is(firstRowResponse.status, 200);
  t.is(firstRow.row[testTableColumnName], fakeName);
  t.is(firstRow.row[testTableSecondColumnName], fakeMail);

  const secondRowResponse = await request(app.getHttpServer())
    .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${secondIdToUpdate}&age=90`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const secondRow = JSON.parse(secondRowResponse.text);
  t.is(secondRowResponse.status, 200);
  t.is(secondRow.row[testTableColumnName], fakeName);
  t.is(secondRow.row[testTableSecondColumnName], fakeMail);
});

currentTest = 'DELETE /table/row/:slug';

test.serial(`${currentTest} should delete row in table and return result`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForDeletion = insertedSearchedIds[0].id;
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForDeletion}&age=14`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteRowInTableResponse.status, 200);
  const deleteRowInTableRO = JSON.parse(deleteRowInTableResponse.text);

  t.is(deleteRowInTableRO.hasOwnProperty('row'), true);

  //checking that the line was deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 41);
  const deletedRowIndex = rows.map((row: Record<string, unknown>) => row.id).indexOf(idForDeletion);
  t.is(deletedRowIndex < 0, true);
});

test.serial(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);
  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForDeletion = insertedSearchedIds[0].id;
  const connectionId = '';
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${connectionId}?tableName=${testTableName}&id=${idForDeletion}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteRowInTableResponse.status, 404);

  //checking that the line wasn't deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
  const deletedRowIndex = rows.map((row: Record<string, unknown>) => row.id).indexOf(idForDeletion);
  t.is(deletedRowIndex < 0, false);
});

test.serial(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForDeletion = insertedSearchedIds[0].id;
  const connectionId = faker.string.uuid();
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${connectionId}?tableName=${testTableName}&id=${idForDeletion}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteRowInTableResponse.status, 403);
  const { message } = JSON.parse(deleteRowInTableResponse.text);
  t.is(message, Messages.DONT_HAVE_PERMISSIONS);

  //checking that the line wasn't deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
  const deletedRowIndex = rows.map((row: Record<string, unknown>) => row.id).indexOf(idForDeletion);
  t.is(deletedRowIndex < 0, false);
});

test.serial(`${currentTest} should throw an exception when tableName not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForDeletion = insertedSearchedIds[0].id;
  const fakeTableName = '';
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForDeletion}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteRowInTableResponse.status, 400);
  const { message } = JSON.parse(deleteRowInTableResponse.text);
  t.is(message, Messages.TABLE_NAME_MISSING);

  //checking that the line wasn't deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
  const deletedRowIndex = rows.map((row: Record<string, unknown>) => row.id).indexOf(idForDeletion);
  t.is(deletedRowIndex < 0, false);
});

test.serial(`${currentTest} should throw an exception when tableName passed in request is incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForDeletion = insertedSearchedIds[0].id;
  const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForDeletion}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteRowInTableResponse.status, 400);
  const { message } = JSON.parse(deleteRowInTableResponse.text);
  t.is(message, Messages.TABLE_NOT_FOUND);

  //checking that the line wasn't deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
  const deletedRowIndex = rows.map((row: Record<string, unknown>) => row.id).indexOf(idForDeletion);
  t.is(deletedRowIndex < 0, false);
});

test.serial(`${currentTest} should throw an exception when primary key not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForDeletion = insertedSearchedIds[0].id;
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteRowInTableResponse.status, 400);
  const { message } = JSON.parse(deleteRowInTableResponse.text);
  t.is(message, Messages.PRIMARY_KEY_INVALID);

  //checking that the line wasn't deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 42);
  const deletedRowIndex = rows.map((row: Record<string, unknown>) => row.id).indexOf(idForDeletion);
  t.is(deletedRowIndex < 0, false);
});

test.serial(
  `${currentTest} should throw an exception when primary key passed in request has incorrect field name`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const {
      testTableName,
      testTableColumnName,
      testEntitiesSeedsCount,
      testTableSecondColumnName,
      insertedSearchedIds,
    } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const idForDeletion = insertedSearchedIds[0].id;
    const deleteRowInTableResponse = await request(app.getHttpServer())
      .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&fakePKey=${idForDeletion}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(deleteRowInTableResponse.status, 400);
    const { message } = JSON.parse(deleteRowInTableResponse.text);
    t.is(message, Messages.PRIMARY_KEY_INVALID);

    //checking that the line wasn't deleted
    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    t.is(getTableRowsRO.hasOwnProperty('rows'), true);
    t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
    t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

    const { rows, primaryColumns, pagination } = getTableRowsRO;

    t.is(rows.length, 42);
    const deletedRowIndex = rows.map((row: Record<string, unknown>) => row.id).indexOf(idForDeletion);
    t.is(deletedRowIndex < 0, false);
  },
);

test.serial(
  `${currentTest} should throw an exception when primary key passed in request has incorrect field value`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const deleteRowInTableResponse = await request(app.getHttpServer())
      .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${faker.string.uuid()}&age=14`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const deleteRowInTableRO = JSON.parse(deleteRowInTableResponse.text);
    t.is(deleteRowInTableResponse.status, 400);
    t.is(deleteRowInTableRO.message, Messages.ROW_PRIMARY_KEY_NOT_FOUND);
  },
);

currentTest = 'GET /table/row/:slug';

test.serial(`${currentTest} found row`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForSearch = insertedSearchedIds[0].id;
  const foundRowInTableResponse = await request(app.getHttpServer())
    .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}&age=14`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(foundRowInTableResponse.status, 200);
  const foundRowInTableRO = JSON.parse(foundRowInTableResponse.text);
  t.is(foundRowInTableRO.hasOwnProperty('row'), true);
  t.is(foundRowInTableRO.hasOwnProperty('structure'), true);
  t.is(foundRowInTableRO.hasOwnProperty('foreignKeys'), true);
  t.is(foundRowInTableRO.hasOwnProperty('primaryColumns'), true);
  t.is(foundRowInTableRO.hasOwnProperty('readonly_fields'), true);
  t.is(typeof foundRowInTableRO.row, 'object');
  t.is(typeof foundRowInTableRO.structure, 'object');
  t.is(typeof foundRowInTableRO.primaryColumns, 'object');
  t.is(typeof foundRowInTableRO.readonly_fields, 'object');
  t.is(typeof foundRowInTableRO.foreignKeys, 'object');
  t.is(foundRowInTableRO.row.id, idForSearch);
  t.is(foundRowInTableRO.row[testTableColumnName], testSearchedUserName);
  t.is(Object.keys(foundRowInTableRO.row).length, 6);
});

test.serial(`${currentTest} should throw an exception, when connection id is not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const idForSearch = insertedSearchedIds[0].id;
  createConnectionRO.id = '';
  const foundRowInTableResponse = await request(app.getHttpServer())
    .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(foundRowInTableResponse.status, 404);
});

test.serial(
  `${currentTest} should throw an exception, when connection id passed in request is incorrect`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const {
      testTableName,
      testTableColumnName,
      testEntitiesSeedsCount,
      testTableSecondColumnName,
      insertedSearchedIds,
    } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const idForSearch = insertedSearchedIds[0].id;
    createConnectionRO.id = faker.string.uuid();
    const foundRowInTableResponse = await request(app.getHttpServer())
      .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(foundRowInTableResponse.status, 403);
    const { message } = JSON.parse(foundRowInTableResponse.text);
    t.is(message, Messages.DONT_HAVE_PERMISSIONS);
  },
);

test.serial(`${currentTest} should throw an exception, when tableName in not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForSearch = insertedSearchedIds[0].id;
  const fakeTableName = '';
  const foundRowInTableResponse = await request(app.getHttpServer())
    .get(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForSearch}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(foundRowInTableResponse.status, 400);
  const { message } = JSON.parse(foundRowInTableResponse.text);
  t.is(message, Messages.TABLE_NAME_MISSING);
});

test.serial(`${currentTest} should throw an exception, when tableName passed in request is incorrect`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const idForSearch = insertedSearchedIds[0].id;
  const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
  const foundRowInTableResponse = await request(app.getHttpServer())
    .get(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForSearch}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const FoundRowRO = JSON.parse(foundRowInTableResponse.text);
  t.is(foundRowInTableResponse.status, 400);
  t.is(FoundRowRO.message, Messages.TABLE_NOT_FOUND);
});

test.serial(`${currentTest} should throw an exception, when primary key is not passed in request`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const foundRowInTableResponse = await request(app.getHttpServer())
    .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(foundRowInTableResponse.status, 400);
  const { message } = JSON.parse(foundRowInTableResponse.text);
  t.is(message, Messages.PRIMARY_KEY_INVALID);
});

test.serial(
  `${currentTest} should throw an exception, when primary key passed in request has incorrect name`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const {
      testTableName,
      testTableColumnName,
      testEntitiesSeedsCount,
      testTableSecondColumnName,
      insertedSearchedIds,
    } = await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const idForSearch = insertedSearchedIds[0].id;
    const foundRowInTableResponse = await request(app.getHttpServer())
      .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&fakeKeyName=${idForSearch}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(foundRowInTableResponse.status, 400);
    const { message } = JSON.parse(foundRowInTableResponse.text);
    t.is(message, Messages.PRIMARY_KEY_INVALID);
  },
);

test.serial(
  `${currentTest} should throw an exception, when primary key passed in request has incorrect value`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    testTables.push(testTableName);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const idForSearch = faker.string.uuid();
    const foundRowInTableResponse = await request(app.getHttpServer())
      .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}&age=14`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(foundRowInTableResponse.status, 400);
    const { message } = JSON.parse(foundRowInTableResponse.text);
    t.is(message, Messages.ROW_PRIMARY_KEY_NOT_FOUND);
  },
);

currentTest = 'PUT /table/rows/delete/:slug';

test.serial(`${currentTest} should delete row in table and return result`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const primaryKeysForDeletion: Array<Record<string, unknown>> = [
    {
      id: insertedSearchedIds[0].id,
      age: 14,
    },
    {
      id: insertedSearchedIds[1].id,
      age: 90,
    },
    {
      id: insertedSearchedIds[2].id,
      age: 95,
    },
  ];
  const deleteRowsInTableResponse = await request(app.getHttpServer())
    .put(`/table/rows/delete/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(primaryKeysForDeletion)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteRowsInTableResponse.status, 200);
  const deleteRowInTableRO = JSON.parse(deleteRowsInTableResponse.text);

  //checking that the line was deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
  // check that lines was deleted

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, testEntitiesSeedsCount - primaryKeysForDeletion.length);

  for (const key of primaryKeysForDeletion) {
    t.is(
      rows.findIndex((row) => row.id === key.id),
      -1,
    );
  }

  // check that table deletion was logged
  const tableLogsResponse = await request(app.getHttpServer())
    .get(`/logs/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(tableLogsResponse.status, 200);

  const tableLogsRO = JSON.parse(tableLogsResponse.text);
  t.is(tableLogsRO.logs.length, primaryKeysForDeletion.length + 1);
  const onlyDeleteLogs = tableLogsRO.logs.filter((log) => log.operationType === LogOperationTypeEnum.deleteRow);
  for (const key of primaryKeysForDeletion) {
    t.is(onlyDeleteLogs.findIndex((log) => log.received_data.id === key.id) >= 0, true);
  }
});

currentTest = 'DELETE /table/rows/:slug';

test.serial(`${currentTest} should delete rows in table and return result`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName, insertedSearchedIds } =
    await createTestTable(connectionToTestDB);

  testTables.push(testTableName);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const primaryKeysForDeletion = [
    {
      id: insertedSearchedIds[0].id,
      age: 14,
    },
    {
      id: insertedSearchedIds[1].id,
      age: 90,
    },
    {
      id: insertedSearchedIds[2].id,
      age: 95,
    },
  ];
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/rows/delete/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(primaryKeysForDeletion)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const deleteRowInTableRO = JSON.parse(deleteRowInTableResponse.text);
  t.is(deleteRowInTableResponse.status, 200);

  //checking that the line was deleted
  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
  t.is(getTableRowsResponse.status, 200);

  t.is(getTableRowsRO.hasOwnProperty('rows'), true);
  t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
  t.is(getTableRowsRO.hasOwnProperty('pagination'), true);

  const { rows, primaryColumns, pagination } = getTableRowsRO;

  t.is(rows.length, 39);
  for (const primaryKey of primaryKeysForDeletion) {
    t.is(
      rows.findIndex((row) => row.id === primaryKey.id),
      -1,
    );
  }

  // check that deletion of rows was logged

  const getTableLogs = await request(app.getHttpServer())
    .get(`/logs/${createConnectionRO.id}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const getRowInTableRO = JSON.parse(getTableLogs.text);
  const deleteRowsLogs = getRowInTableRO.logs.filter((log) => log.operationType === LogOperationTypeEnum.deleteRow);
  t.is(deleteRowsLogs.length, primaryKeysForDeletion.length);
});

currentTest = 'POST /connection/test';

test.serial(`${currentTest} should test connection and return result`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

  const testConnectionResponse = await request(app.getHttpServer())
    .post('/connection/test/')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(testConnectionResponse.status, 201);
  const { message } = JSON.parse(testConnectionResponse.text);
  t.is(message, 'Successfully connected');
});

test.serial(
  `${currentTest} should test connection and return negative result when connection password is incorrect result`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

    connectionToTestDB.password = '8764323452888';
    connectionToTestDB.database = 'test_db';
    const testConnectionResponse = await request(app.getHttpServer())
      .post('/connection/test/')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(testConnectionResponse.status, 201);
    const { result } = JSON.parse(testConnectionResponse.text);
    t.is(result, false);
  },
);

currentTest = 'GET table/csv/:slug';

test.serial(`${currentTest} should return csv file with table data`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const getTableCsvResponse = await request(app.getHttpServer())
    .post(`/table/csv/export/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'text/csv')
    .set('Accept', 'text/csv');

  if (getTableCsvResponse.status !== 201) {
    const getTableCsvResponseRO = JSON.parse(getTableCsvResponse.text);
    console.info(getTableCsvResponseRO);
  }
  t.is(getTableCsvResponse.status, 201);
  const fileName = `${testTableName}.csv`;
  const downloadedFilePatch = join(__dirname, 'response-files', fileName);

  const dir = join(__dirname, 'response-files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.writeFileSync(downloadedFilePatch, getTableCsvResponse.body);

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const isFileExists = fs.existsSync(downloadedFilePatch);
  t.is(isFileExists, true);
});

test.serial(`${currentTest} should throw exception when csv export is disabled in table settings`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
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
    false,
    false,
  );

  const createTableSettingsResponse = await request(app.getHttpServer())
    .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
    .send(createTableSettingsDTO)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(createTableSettingsResponse.status, 201);

  const getTableCsvResponse = await request(app.getHttpServer())
    .post(`/table/csv/export/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'text/csv')
    .set('Accept', 'text/csv');

  t.is(getTableCsvResponse.status, 400);
  const { message } = JSON.parse(getTableCsvResponse.text);
  t.is(message, Messages.CSV_EXPORT_DISABLED);
});

test.serial(
  `${currentTest} should return csv file with table data with search, with pagination, with sorting,
with search and pagination: page=1, perPage=2 and DESC sorting`,
  async (t) => {
    const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
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

    const getTableCsvResponse = await request(app.getHttpServer())
      .post(
        `/table/csv/export/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'text/csv')
      .set('Accept', 'text/csv');

    if (getTableCsvResponse.status !== 201) {
      console.info(getTableCsvResponse.text);
    }
    t.is(getTableCsvResponse.status, 201);
    const fileName = `${testTableName}.csv`;
    const downloadedFilePatch = join(__dirname, 'response-files', fileName);

    const dir = join(__dirname, 'response-files');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(downloadedFilePatch, getTableCsvResponse.body);

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const isFileExists = fs.existsSync(downloadedFilePatch);
    t.is(isFileExists, true);
  },
);

currentTest = 'POST /table/csv/import/:slug';
test.serial(`${currentTest} should import csv file with table data`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
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

  const getTableCsvResponse = await request(app.getHttpServer())
    .post(
      `/table/csv/export/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2`,
    )
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'text/csv')
    .set('Accept', 'text/csv');

  if (getTableCsvResponse.status !== 201) {
    console.info(getTableCsvResponse.text);
  }
  t.is(getTableCsvResponse.status, 201);
  const fileName = `${testTableName}.csv`;
  const downloadedFilePatch = join(__dirname, 'response-files', fileName);

  const dir = join(__dirname, 'response-files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.writeFileSync(downloadedFilePatch, getTableCsvResponse.body);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const isFileExists = fs.existsSync(downloadedFilePatch);
  t.is(isFileExists, true);

  function changeIdFieldsValuesInCsvFile(filePatch: string) {
    const fileContent = fs.readFileSync(filePatch).toString();
    const rows = fileContent.split('\n');
    const newRows = rows.map((row, index) => {
      if (index === 0) {
        return row;
      }
      const columns = row.split(',');
      if (columns.length === 1) {
        return row;
      }
      columns[0] = `5${index}`;
      return columns.join(',');
    });
    return newRows.join('\n');
  }

  const newFileContent = changeIdFieldsValuesInCsvFile(downloadedFilePatch);
  fs.writeFileSync(downloadedFilePatch, newFileContent);

  const importCsvResponse = await request(app.getHttpServer())
    .post(`/table/csv/import/${createConnectionRO.id}?tableName=${testTableName}`)
    .attach('file', downloadedFilePatch)
    .set('Cookie', firstUserToken)
    .set('Accept', 'application/json');

  const importCsvRO = JSON.parse(importCsvResponse.text);
  t.is(importCsvResponse.status, 201);

  //checking that the lines was added

  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
  t.is(getTableRowsResponse.status, 200);
  t.is(getTableRowsRO.rows.length, testEntitiesSeedsCount + 2);
});

test.serial(`${currentTest} should throw exception whe csv import is disabled`, async (t) => {
  const connectionToTestDB = getTestData(mockFactory).cassandraTestConnection;
  const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

  const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
    await createTestTable(connectionToTestDB);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToTestDB)
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
    false,
    true,
  );

  const createTableSettingsResponse = await request(app.getHttpServer())
    .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
    .send(createTableSettingsDTO)
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(createTableSettingsResponse.status, 201);

  const getTableCsvResponse = await request(app.getHttpServer())
    .post(
      `/table/csv/export/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2`,
    )
    .set('Cookie', firstUserToken)
    .set('Content-Type', 'text/csv')
    .set('Accept', 'text/csv');

  if (getTableCsvResponse.status !== 201) {
    console.info(getTableCsvResponse.text);
  }
  t.is(getTableCsvResponse.status, 201);
  const fileName = `${testTableName}.csv`;
  const downloadedFilePatch = join(__dirname, 'response-files', fileName);

  const dir = join(__dirname, 'response-files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.writeFileSync(downloadedFilePatch, getTableCsvResponse.body);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const isFileExists = fs.existsSync(downloadedFilePatch);
  t.is(isFileExists, true);

  function changeIdFieldsValuesInCsvFile(filePatch: string) {
    const fileContent = fs.readFileSync(filePatch).toString();
    const rows = fileContent.split('\n');
    const newRows = rows.map((row, index) => {
      if (index === 0) {
        return row;
      }
      const columns = row.split(',');
      if (columns.length === 1) {
        return row;
      }
      columns[0] = `5${index}`;
      return columns.join(',');
    });
    return newRows.join('\n');
  }

  const newFileContent = changeIdFieldsValuesInCsvFile(downloadedFilePatch);
  fs.writeFileSync(downloadedFilePatch, newFileContent);

  const importCsvResponse = await request(app.getHttpServer())
    .post(`/table/csv/import/${createConnectionRO.id}?tableName=${testTableName}`)
    .attach('file', downloadedFilePatch)
    .set('Cookie', firstUserToken)
    .set('Accept', 'application/json');

  t.is(importCsvResponse.status, 400);

  const { message } = JSON.parse(importCsvResponse.text);
  t.is(message, Messages.CSV_IMPORT_DISABLED);
});
