import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { ApplicationModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter';
import { Messages } from '../../src/exceptions/text/messages';
import { Cacher } from '../../src/helpers/cache/cacher';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { MockFactory } from '../mock.factory';
import { getTestData } from '../utils/get-test-data';
import { TestUtils } from '../utils/test.utils';

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
    console.error('After custom field error: ' + e);
  }
});

currentTest = 'GET /settings/';

test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).internalConnection;
    const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
    console.log("🚀 ~ file: table-settings-e2e.test.ts:58 ~ test ~ createdConnection.text", createdConnection.text)
    
  const tableName = '';
  const findSettingsResponce = await request(app.getHttpServer())
    .get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(findSettingsResponce.status, 400);
  const findSettingsRO = JSON.parse(findSettingsResponce.text);
  t.is(findSettingsRO.message, Messages.TABLE_NAME_MISSING);

  } catch (e) {
    console.error(e);
  }
});

// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });

// test(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
//   try {
//     const newConnection = getTestData(mockFactory).internalConnection;
//   } catch (e) {
//     console.error(e);
//   }
// });
