import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { TestUtils } from '../../utils/test.utils.js';
import { createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection } from '../../utils/user-with-different-permissions-utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app: INestApplication;
let currentTest: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let testUtils: TestUtils;

const mockFactory = new MockFactory();

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(WinstonLogger)));
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

currentTest = 'GET /logs/:slug';
test.serial(`${currentTest} should return all found logs in connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    /* eslint-disable */
    const created_at = new Date();
    const updated_at = new Date();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(addRowInTable.status, 201);

    const getTableLogs = await request(app.getHttpServer())
      .get(`/logs/${testData.connections.firstId}`)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getRowInTableRO = JSON.parse(getTableLogs.text);

    t.is(getRowInTableRO.logs.length, 1);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('table_name'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('received_data'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('old_data'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('cognitoUserName'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('email'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('operationType'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('operationStatusResult'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('createdAt'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('connection_id'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test.serial(
  `${currentTest} should return all found logs in connection with included searched primary keys`,
  async (t) => {
    try {
      const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

      const randomName = faker.person.firstName();
      const randomEmail = faker.internet.email();
      /* eslint-disable */
      const created_at = new Date();
      const updated_at = new Date();
      const addRowInTable = await request(app.getHttpServer())
        .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
        .send({
          [testData.firstTableInfo.testTableColumnName]: randomName,
          [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
          created_at: created_at,
          updated_at: updated_at,
        })
        .set('Cookie', testData.users.simpleUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(addRowInTable.status, 201);

      const getTableLogs = await request(app.getHttpServer())
        .get(`/logs/${testData.connections.firstId}`)
        .set('Cookie', testData.users.adminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const getLogsInTableRO = JSON.parse(getTableLogs.text);

      t.is(getLogsInTableRO.logs.length, 1);
      t.is(getLogsInTableRO.logs[0].hasOwnProperty('affected_primary_key'), true);
      const searchedAffectedPrimaryKey = JSON.stringify(getLogsInTableRO.logs[0].affected_primary_key);

      let additionalRowAddResponse = await request(app.getHttpServer())
        .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
        .send({
          [testData.firstTableInfo.testTableColumnName]: faker.person.firstName(),
          [testData.firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .set('Cookie', testData.users.simpleUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(additionalRowAddResponse.status, 201);

      additionalRowAddResponse = await request(app.getHttpServer())
        .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
        .send({
          [testData.firstTableInfo.testTableColumnName]: faker.person.firstName(),
          [testData.firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .set('Cookie', testData.users.simpleUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(additionalRowAddResponse.status, 201);

      additionalRowAddResponse = await request(app.getHttpServer())
        .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
        .send({
          [testData.firstTableInfo.testTableColumnName]: faker.person.firstName(),
          [testData.firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .set('Cookie', testData.users.simpleUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(additionalRowAddResponse.status, 201);

      additionalRowAddResponse = await request(app.getHttpServer())
        .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
        .send({
          [testData.firstTableInfo.testTableColumnName]: faker.person.firstName(),
          [testData.firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .set('Cookie', testData.users.simpleUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(additionalRowAddResponse.status, 201);

      //check that logs was created

      const getTableLogsAfterAddingExtraRows = await request(app.getHttpServer())
        .get(`/logs/${testData.connections.firstId}`)
        .set('Cookie', testData.users.adminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const getRowAfterAddingExtraRowsRO = JSON.parse(getTableLogsAfterAddingExtraRows.text);

      t.is(getRowAfterAddingExtraRowsRO.logs.length, 5);

      const getTableLogsSearched = await request(app.getHttpServer())
        .get(`/logs/${testData.connections.firstId}?affected_primary_key=${searchedAffectedPrimaryKey}`)
        .set('Cookie', testData.users.adminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const getRowInTableSearchedRO = JSON.parse(getTableLogsSearched.text);
      t.is(getTableLogsSearched.status, 200);
      t.is(getRowInTableSearchedRO.logs.length, 1);
      t.is(JSON.stringify(getRowInTableSearchedRO.logs[0].affected_primary_key), searchedAffectedPrimaryKey);
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
);

test.serial(
  `${currentTest} should not return all found logs in connection, when table audit is disabled in connection'`,
  async (t) => {
    try {
      const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
      const {
        connections,
        firstTableInfo,
        groups,
        permissions,
        secondTableInfo,
        users: { adminUserToken, simpleUserToken },
      } = testData;
      const randomName = faker.person.firstName();
      const randomEmail = faker.internet.email();
      const created_at = new Date();
      const updated_at = new Date();

      const updateConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();

      const updateConnectionResponse = await request(app.getHttpServer())
        .put(`/connection/${connections.firstId}`)
        .send(updateConnection)
        .set('Cookie', adminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      t.is(updateConnectionResponse.status, 200);

      const newConnectionProperties = mockFactory.generateConnectionPropertiesUserExcluded(null, false);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${connections.firstId}`)
        .send(newConnectionProperties)
        .set('Cookie', adminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      t.is(createConnectionPropertiesResponse.status, 201);

      const addRowInTable = await request(app.getHttpServer())
        .post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
        .send({
          [firstTableInfo.testTableColumnName]: randomName,
          [firstTableInfo.testTableSecondColumnName]: randomEmail,
          created_at: created_at,
          updated_at: updated_at,
        })
        .set('Cookie', simpleUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(addRowInTable.status, 201);

      const getTableLogs = await request(app.getHttpServer())
        .get(`/logs/${connections.firstId}`)
        .set('Cookie', simpleUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const getRowInTableRO = JSON.parse(getTableLogs.text);

      t.is(getRowInTableRO.logs.length, 0);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

currentTest = 'GET /logs/export/:connectionId';
test.serial(`${currentTest} should return all found logs in connection as csv`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const testTableName = testData.firstTableInfo.testTableName;
    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    /* eslint-disable */
    const created_at = new Date();
    const updated_at = new Date();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${testData.connections.firstId}?tableName=${testTableName}`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(addRowInTable.status, 201);

    const getTableLogsCSV = await request(app.getHttpServer())
      .get(`/logs/export/${testData.connections.firstId}`)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    if (getTableLogsCSV.status !== 201) {
      console.log(getTableLogsCSV.text);
    }
    t.is(getTableLogsCSV.status, 200);
    const fileName = `${testTableName}.csv`;
    const downloadedFilePatch = join(__dirname, 'response-files', fileName);
    const dir = join(__dirname, 'response-files');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(downloadedFilePatch, getTableLogsCSV.body);

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const isFileExists = fs.existsSync(downloadedFilePatch);
    t.is(isFileExists, true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});
