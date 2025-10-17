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
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { getTestKnex } from '../../utils/get-test-knex.js';
import { getRandomTestTableName } from '../../utils/get-random-test-table-name.js';
import {
  createTestTablesWithComplexPFKeys,
  createTestTablesWithSimplePFKeys,
} from './test-utilities/create-test-postgres-tables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
const testSearchedUserName = 'Vasia';
const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;

let testTablesCompositeKeysData: TableCreationResult;
let testTablesSimpleKeysData: TableCreationResult;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication() as any;
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

  testTablesCompositeKeysData = await createTestTablesWithComplexPFKeys(connectionToTestDB);
  testTablesSimpleKeysData = await createTestTablesWithSimplePFKeys(connectionToTestDB);
});

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
});

export type TableCreationResult = {
  main_table: {
    table_name: string;
    column_names: string[];
    foreign_key_column_names: string[];
    binary_column_names: string[];
    primary_key_column_names: string[];
  };
  first_referenced_table: {
    table_name: string;
    column_names: string[];
    primary_key_column_names: string[];
  };
  second_referenced_table: {
    table_name: string;
    column_names: string[];
    primary_key_column_names: string[];
    foreign_key_column_names: string[];
  };
};

// GET /connection/tables/:slug

test.serial(`GET /connection/tables/:slug - Should return list of table rows with referenced columns, when primary and foreign keys has composite structure`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const { main_table, first_referenced_table, second_referenced_table } = testTablesCompositeKeysData;

    const getMainTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getMainTableRowsRO = JSON.parse(getMainTableRowsResponse.text);
    t.is(getMainTableRowsResponse.status, 200);

    const getFirstReferencedTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getFirstReferencedTableRowsRO = JSON.parse(getFirstReferencedTableRowsResponse.text);
    t.is(getFirstReferencedTableRowsResponse.status, 200);

    const firstReturnedRows = getFirstReferencedTableRowsRO.rows;

    for (const row of firstReturnedRows) {
      t.is(typeof row.order_id, 'object');
      t.truthy(row.order_id.hasOwnProperty('order_id'));
      t.truthy(row.order_id.order_id);
      t.truthy(typeof row.order_id.order_id === 'number');
      t.is(typeof row.customer_id, 'object');
      t.truthy(row.customer_id.hasOwnProperty('customer_id'));
      t.truthy(row.customer_id.customer_id);
      t.truthy(typeof row.customer_id.customer_id === 'number');
    }

    const getSecondReferencedTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${second_referenced_table.table_name}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getSecondReferencedTableRowsRO = JSON.parse(getSecondReferencedTableRowsResponse.text);
    t.is(getSecondReferencedTableRowsResponse.status, 200);
    const secondReturnedRows = getSecondReferencedTableRowsRO.rows;
    for (const row of secondReturnedRows) {
      t.is(typeof row.order_id, 'object');
      t.truthy(row.order_id.hasOwnProperty('order_id'));
      t.truthy(row.order_id.order_id);
      t.truthy(typeof row.order_id.order_id === 'number');
      t.is(typeof row.customer_id, 'object');
      t.truthy(row.customer_id.hasOwnProperty('customer_id'));
      t.truthy(row.customer_id.customer_id);
      t.truthy(typeof row.customer_id.customer_id === 'number');
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test.serial(
  `GET /connection/tables/:slug - Should return list of table rows with referenced columns, when primary and foreign keys has simple structure`,
  async (t) => {
    try {
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      t.is(createConnectionResponse.status, 201);

      const { main_table, first_referenced_table, second_referenced_table } = testTablesSimpleKeysData;

      const getMainTableRowsResponse = await request(app.getHttpServer())
        .get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const getMainTableRowsRO = JSON.parse(getMainTableRowsResponse.text);
      t.is(getMainTableRowsResponse.status, 200);

      const getFirstReferencedTableRowsResponse = await request(app.getHttpServer())
        .get(`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const getFirstReferencedTableRowsRO = JSON.parse(getFirstReferencedTableRowsResponse.text);
      t.is(getFirstReferencedTableRowsResponse.status, 200);

      const firstReturnedRows = getFirstReferencedTableRowsRO.rows;

      for (const element of firstReturnedRows) {
        t.is(typeof element.customer_id, 'object');
        t.truthy(element.customer_id.hasOwnProperty('customer_id'));
        t.truthy(element.customer_id.customer_id);
        t.truthy(typeof element.customer_id.customer_id === 'number');
      }

      const getSecondReferencedTableRowsResponse = await request(app.getHttpServer())
        .get(`/table/rows/${createConnectionRO.id}?tableName=${second_referenced_table.table_name}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const getSecondReferencedTableRowsRO = JSON.parse(getSecondReferencedTableRowsResponse.text);
      t.is(getSecondReferencedTableRowsResponse.status, 200);

      const secondReturnedRows = getSecondReferencedTableRowsRO.rows;
      for (const element of secondReturnedRows) {
        t.is(typeof element.order_id, 'object');
        t.truthy(element.order_id.hasOwnProperty('order_id'));
        t.truthy(element.order_id.order_id);
        t.truthy(typeof element.order_id.order_id === 'number');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);
