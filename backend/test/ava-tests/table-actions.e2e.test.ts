import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { ApplicationModule } from '../../src/app.module';
import { TableActionEntity } from '../../src/entities/table-actions/table-action.entity';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter';
import { Cacher } from '../../src/helpers/cache/cacher';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { MockFactory } from '../mock.factory';
import { registerUserAndReturnUserInfo } from '../utils/register-user-and-return-user-info';
import { TestUtils } from '../utils/test.utils';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let newConnection;
let newTableAction: TableActionEntity;
let testTableName: string;
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
  newTableAction = mockFactory.generateNewTableAction();
  newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
});

test.after.always('Close app connection', async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
});

currentTest = 'POST /table/action/:slug';

test(`${currentTest} should return created table action`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const createTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 201);
  t.is(typeof createTableActionRO, 'object');
  t.is(createTableActionRO.title, newTableAction.title);
  t.is(createTableActionRO.type, newTableAction.type);
  t.is(createTableActionRO.url, newTableAction.url);
  t.is(createTableActionRO.hasOwnProperty('id'), true);
});
