/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { LogOperationTypeEnum, QueryOrderingEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { clearAllTestKnex, getTestKnex } from '../../utils/get-test-knex.js';
import { Knex } from 'knex';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

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
  await loadTestData();
});

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
});

const testUsersTableName = 'users';
const testTransactionsTableName = 'transactions';

const createUsersTableRawQuery = `
CREATE TABLE users (
    userId SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`;

const createTransactionsTableRawQuery = `CREATE TABLE transactions (
    buyerId INT,
    reviewerId INT,
    transaction_date DATE NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (buyerId, reviewerId),
    FOREIGN KEY (buyerId) REFERENCES users(userId),
    FOREIGN KEY (reviewerId) REFERENCES users(userId)
);`;

const testEntitiesCount = 500;

async function fillUsersTable(knex: Knex<any, any[]>): Promise<void> {
  for (let i = 0; i < testEntitiesCount; i++) {
    await knex('users').insert({ username: faker.person.firstName() });
  }
}

const insertedIdCombos: Array<{ buyerid: number; reviewerid: number }> = [];

async function fillTransactionsTable(knex: Knex<any, any[]>): Promise<void> {
  for (let i = 0; i < testEntitiesCount; i++) {
    const { buyerid, reviewerid } = getUniqueIdsComboForInsert();
    await knex('transactions').insert({
      buyerid: buyerid,
      reviewerid: reviewerid,
      transaction_date: faker.date.past(),
      description: faker.lorem.sentence(),
      amount: faker.number.int({ min: 100, max: 10000 }),
    });
  }
}

function getUniqueIdsCombo(): { buyerid: number; reviewerid: number } {
  return {
    buyerid: faker.number.int({ min: 1, max: testEntitiesCount }),
    reviewerid: faker.number.int({ min: 1, max: testEntitiesCount }),
  };
}

function getUniqueIdsComboForInsert(): { buyerid: number; reviewerid: number } {
  if (insertedIdCombos.length >= testEntitiesCount) {
    return insertedIdCombos.shift();
  }
  while (true) {
    const { buyerid, reviewerid } = getUniqueIdsCombo();
    if (!insertedIdCombos.find((idCombo) => idCombo.buyerid === buyerid && idCombo.reviewerid === reviewerid)) {
      insertedIdCombos.push({ buyerid, reviewerid });
      return { buyerid, reviewerid };
    }
  }
}

async function loadTestData(): Promise<void> {
  const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
  const testKnex = getTestKnex(connectionToTestDB);
  await testKnex.raw(`DROP TABLE IF EXISTS transactions;`);
  await testKnex.raw(`DROP TABLE IF EXISTS users;`);
  await testKnex.raw(createUsersTableRawQuery);
  await testKnex.raw(createTransactionsTableRawQuery);
  await fillUsersTable(testKnex);
  await fillTransactionsTable(testKnex);
  await clearAllTestKnex();
}

currentTest = 'GET /connection/tables/:slug';
test.serial(`${currentTest} should return list of tables in connection`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

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
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /table/rows/:slug';

test.serial(`${currentTest} should return list of rows of the tables`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const foundRowsFromUsersTableResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testUsersTableName}&page=1&perPage=500`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const foundRowsFromUsersTableRO = JSON.parse(foundRowsFromUsersTableResponse.text);
    t.is(typeof foundRowsFromUsersTableRO, 'object');
    t.is(foundRowsFromUsersTableRO.hasOwnProperty('rows'), true);
    t.is(foundRowsFromUsersTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(foundRowsFromUsersTableRO.hasOwnProperty('pagination'), true);
    t.is(foundRowsFromUsersTableRO.rows.length, 500);
    t.is(Object.keys(foundRowsFromUsersTableRO.rows[1]).length, 4);
    t.is(foundRowsFromUsersTableRO.rows[0].hasOwnProperty('userid'), true);
    t.is(foundRowsFromUsersTableRO.rows[1].hasOwnProperty('username'), true);
    t.is(foundRowsFromUsersTableRO.rows[2].hasOwnProperty('created_at'), true);

    const foundRowsFromTransactionsTableResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTransactionsTableName}&page=1&perPage=500`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const foundRowsFromTransactionsTableRO = JSON.parse(foundRowsFromTransactionsTableResponse.text);
    t.is(typeof foundRowsFromTransactionsTableRO, 'object');
    t.is(foundRowsFromTransactionsTableRO.hasOwnProperty('rows'), true);
    t.is(foundRowsFromTransactionsTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(foundRowsFromTransactionsTableRO.hasOwnProperty('pagination'), true);
    t.is(foundRowsFromTransactionsTableRO.rows.length, 500);
    t.is(Object.keys(foundRowsFromTransactionsTableRO.rows[1]).length, 7);
    t.is(foundRowsFromTransactionsTableRO.rows[0].hasOwnProperty('buyerid'), true);
    t.is(foundRowsFromTransactionsTableRO.rows[1].hasOwnProperty('reviewerid'), true);
    t.is(foundRowsFromTransactionsTableRO.rows[2].hasOwnProperty('transaction_date'), true);

    for (const row of foundRowsFromTransactionsTableRO.rows) {
      t.is(row.hasOwnProperty('buyerid'), true);
      const buyerId = row.buyerid;
      t.is(typeof buyerId, 'object');
      t.is(buyerId.hasOwnProperty('userid'), true);
      t.is(typeof buyerId.userid, 'number');
      const reviewerId = row.reviewerid;
      t.is(typeof reviewerId, 'object');
      t.is(reviewerId.hasOwnProperty('userid'), true);
      t.is(typeof reviewerId.userid, 'number');
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
});
