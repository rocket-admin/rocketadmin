import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';
import { Test } from '@nestjs/testing';
import { TableActionEntity } from '../../../src/entities/table-actions/table-action.entity.js';
import { MockFactory } from '../../mock.factory.js';
import { faker } from '@faker-js/faker';
import knex from 'knex';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import request from 'supertest';
import { CreateTableTriggersBodyDTO } from '../../../src/entities/table-triggers/application/dto/create-table-triggers-body.dto.js';
import { TableTriggerEventEnum } from '../../../src/enums/table-trigger-event-enum.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let newConnection;
let newTableAction: TableActionEntity;
let currentTest;
const testTableName = 'users';
const testTableColumnName = 'name';
const testTAbleSecondColumnName = 'email';
const testSearchedUserName = 'Vasia';
const testEntitiesSeedsCount = 42;

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
  newTableAction = mockFactory.generateNewTableAction();
  newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
  await resetPostgresTestDB();
});

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
        [testTableColumnName]: faker.person.firstName(),
        [testTAbleSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }
  await Knex.destroy();
}

test.after.always('Close app connection', async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
});

currentTest = 'POST /table/triggers/:connectionId';
test.skip(`${currentTest} should return created table trigger`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);

  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  // create table action to attach to trigger

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

  // create table trigger

  const tableTriggerDTO: CreateTableTriggersBodyDTO = {
    actions_ids: [createTableActionRO.id],
    trigger_events: [TableTriggerEventEnum.ADD_ROW, TableTriggerEventEnum.UPDATE_ROW],
  };

  const createTableTriggerResult = await request(app.getHttpServer())
    .post(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(tableTriggerDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableTriggerRO = JSON.parse(createTableTriggerResult.text);
  console.log('🚀 ~ test ~ createTableTriggerRO:', createTableTriggerRO);
  t.is(createTableTriggerResult.status, 201);
  t.is(typeof createTableTriggerRO, 'object');
  t.is(createTableTriggerRO.hasOwnProperty('id'), true);
  t.is(createTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(createTableTriggerRO.hasOwnProperty('actions'), true);
  t.is(createTableTriggerRO.hasOwnProperty('created_at'), true);
});

currentTest = 'GET /table/triggers/:connectionId';
