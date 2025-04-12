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

currentTest = `POST /table-filters/:connectionId`;
test.serial(`${currentTest} should return list of tables in connection`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName } = await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ filters })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);
    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('tableName'), true);
    t.is(createTableFiltersRO.hasOwnProperty('connectionId'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.deepEqual(createTableFiltersRO.filters, filters);

    // should rewrite filters when pass new one

    const newFieldValue = '18';
    const newFilters = {
      [fieldname]: { gt: newFieldValue },
    };
    const updateTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ filters: newFilters })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const updateTableFiltersRO = JSON.parse(updateTableFiltersResponse.text);
    t.is(updateTableFiltersResponse.status, 201);
    t.is(updateTableFiltersRO.hasOwnProperty('id'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('tableName'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('connectionId'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('filters'), true);
    t.deepEqual(updateTableFiltersRO.filters, newFilters);
  } catch (e) {
    console.error(e);
    t.fail();
  }
});

currentTest = `GET /table-filters/:slug`;
test.serial(`${currentTest} should return table filters`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
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

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ filters })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);
    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('tableName'), true);
    t.is(createTableFiltersRO.hasOwnProperty('connectionId'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.deepEqual(createTableFiltersRO.filters, filters);

    const getTableFiltersResponse = await request(app.getHttpServer())
      .get(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getTableFiltersRO = JSON.parse(getTableFiltersResponse.text);
    t.is(getTableFiltersResponse.status, 200);
    t.is(getTableFiltersRO.hasOwnProperty('id'), true);
    t.is(getTableFiltersRO.hasOwnProperty('tableName'), true);
    t.is(getTableFiltersRO.hasOwnProperty('connectionId'), true);
    t.is(getTableFiltersRO.hasOwnProperty('filters'), true);
    t.deepEqual(getTableFiltersRO.filters, filters);
  } catch (e) {
    console.error(e);
    t.fail();
  }
});
