/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { fa, faker } from '@faker-js/faker';
import knex from 'knex';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import request from 'supertest';
import { CreateTableTriggersBodyDTO } from '../../../src/entities/table-triggers/application/dto/create-table-triggers-body.dto.js';
import { TableTriggerEventEnum } from '../../../src/enums/table-trigger-event-enum.js';
import nock from 'nock';
import { CreateTableActionDTO } from '../../../src/entities/table-actions/dto/create-table-action.dto.js';
import { TableActionTypeEnum } from '../../../src/enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../src/enums/table-action-method-enum.js';

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
  newTableAction = mockFactory.generateNewTableAction() as any;
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
test(`${currentTest} should return created table trigger`, async (t) => {
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
  t.is(createTableTriggerResult.status, 201);
  t.is(typeof createTableTriggerRO, 'object');
  t.is(createTableTriggerRO.hasOwnProperty('id'), true);
  t.is(createTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(createTableTriggerRO.hasOwnProperty('table_actions'), true);
  t.is(createTableTriggerRO.hasOwnProperty('created_at'), true);
  t.is(createTableTriggerRO.table_actions.length, 1);
  t.is(createTableTriggerRO.table_actions[0].id, createTableActionRO.id);
  t.is(createTableTriggerRO.table_actions[0].title, newTableAction.title);
  t.is(createTableTriggerRO.table_actions[0].type, newTableAction.type);
  t.is(createTableTriggerRO.table_actions[0].url, newTableAction.url);
  t.is(createTableTriggerRO.table_actions[0].hasOwnProperty('id'), true);
});

currentTest = 'GET /table/triggers/:connectionId';
test(`${currentTest} should return found table triggers`, async (t) => {
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
  t.is(createTableTriggerResult.status, 201);
  t.is(typeof createTableTriggerRO, 'object');
  t.is(createTableTriggerRO.hasOwnProperty('id'), true);
  t.is(createTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(createTableTriggerRO.hasOwnProperty('table_actions'), true);
  t.is(createTableTriggerRO.hasOwnProperty('created_at'), true);
  t.is(createTableTriggerRO.table_actions.length, 1);
  t.is(createTableTriggerRO.table_actions[0].id, createTableActionRO.id);
  t.is(createTableTriggerRO.table_actions[0].title, newTableAction.title);
  t.is(createTableTriggerRO.table_actions[0].type, newTableAction.type);
  t.is(createTableTriggerRO.table_actions[0].url, newTableAction.url);
  t.is(createTableTriggerRO.table_actions[0].hasOwnProperty('id'), true);

  // get table triggers

  const getTableTriggersResult = await request(app.getHttpServer())
    .get(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const getTableTriggersRO = JSON.parse(getTableTriggersResult.text);
  t.is(getTableTriggersResult.status, 200);

  t.is(typeof getTableTriggersRO, 'object');
  t.is(getTableTriggersRO.length, 1);
  t.is(getTableTriggersRO[0].id, createTableTriggerRO.id);
  t.is(getTableTriggersRO[0].trigger_events.length, 2);
  t.is(getTableTriggersRO[0].table_actions.length, 1);
  t.is(getTableTriggersRO[0].table_actions[0].id, createTableActionRO.id);
  t.is(getTableTriggersRO[0].table_actions[0].title, newTableAction.title);
  t.is(getTableTriggersRO[0].table_actions[0].type, newTableAction.type);
  t.is(getTableTriggersRO[0].table_actions[0].url, newTableAction.url);
  t.is(getTableTriggersRO[0].table_actions[0].hasOwnProperty('id'), true);
});

currentTest = 'GET /table/trigger/:connectionId';

test(`${currentTest} should return found table triggers`, async (t) => {
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
  t.is(createTableTriggerResult.status, 201);
  t.is(typeof createTableTriggerRO, 'object');
  t.is(createTableTriggerRO.hasOwnProperty('id'), true);
  t.is(createTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(createTableTriggerRO.hasOwnProperty('table_actions'), true);
  t.is(createTableTriggerRO.hasOwnProperty('created_at'), true);
  t.is(createTableTriggerRO.table_actions.length, 1);
  t.is(createTableTriggerRO.table_actions[0].id, createTableActionRO.id);
  t.is(createTableTriggerRO.table_actions[0].title, newTableAction.title);
  t.is(createTableTriggerRO.table_actions[0].type, newTableAction.type);
  t.is(createTableTriggerRO.table_actions[0].url, newTableAction.url);
  t.is(createTableTriggerRO.table_actions[0].hasOwnProperty('id'), true);

  // get table trigger

  const getTableTriggerResult = await request(app.getHttpServer())
    .get(`/table/trigger/${createConnectionRO.id}?triggerId=${createTableTriggerRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const getTableTriggerRO = JSON.parse(getTableTriggerResult.text);
  t.is(getTableTriggerResult.status, 200);
  t.is(typeof getTableTriggerRO, 'object');
  t.is(getTableTriggerRO.hasOwnProperty('id'), true);
  t.is(getTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(getTableTriggerRO.hasOwnProperty('table_actions'), true);
  t.is(getTableTriggerRO.hasOwnProperty('created_at'), true);
  t.is(getTableTriggerRO.id, createTableTriggerRO.id);
  t.is(getTableTriggerRO.table_actions.length, 1);
  t.is(getTableTriggerRO.table_actions[0].id, createTableActionRO.id);
  t.is(getTableTriggerRO.table_actions[0].title, newTableAction.title);
  t.is(getTableTriggerRO.table_actions[0].type, newTableAction.type);
  t.is(getTableTriggerRO.table_actions[0].url, newTableAction.url);
  t.is(getTableTriggerRO.table_actions[0].hasOwnProperty('id'), true);
});

currentTest = 'PUT /table/triggers/:connectionId';

test(`${currentTest} should return found table triggers`, async (t) => {
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

  const createFirstTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createSecondTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createFirstTableActionRO = JSON.parse(createFirstTableActionResult.text);
  const createSecondTableActionRO = JSON.parse(createSecondTableActionResult.text);
  // create table trigger

  const tableTriggerDTO: CreateTableTriggersBodyDTO = {
    actions_ids: [createFirstTableActionRO.id],
    trigger_events: [TableTriggerEventEnum.ADD_ROW, TableTriggerEventEnum.UPDATE_ROW],
  };

  const createTableTriggerResult = await request(app.getHttpServer())
    .post(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(tableTriggerDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableTriggerRO = JSON.parse(createTableTriggerResult.text);
  t.is(createTableTriggerResult.status, 201);
  t.is(typeof createTableTriggerRO, 'object');
  t.is(createTableTriggerRO.hasOwnProperty('id'), true);
  t.is(createTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(createTableTriggerRO.hasOwnProperty('table_actions'), true);
  t.is(createTableTriggerRO.hasOwnProperty('created_at'), true);
  t.is(createTableTriggerRO.table_actions.length, 1);
  t.is(createTableTriggerRO.table_actions[0].id, createFirstTableActionRO.id);
  t.is(createTableTriggerRO.table_actions[0].title, newTableAction.title);
  t.is(createTableTriggerRO.table_actions[0].type, newTableAction.type);
  t.is(createTableTriggerRO.table_actions[0].url, newTableAction.url);
  t.is(createTableTriggerRO.table_actions[0].hasOwnProperty('id'), true);

  // get table triggers
  const updateTableTriggerDTO: CreateTableTriggersBodyDTO = {
    actions_ids: [createSecondTableActionRO.id],
    trigger_events: [TableTriggerEventEnum.DELETE_ROW, TableTriggerEventEnum.UPDATE_ROW],
  };

  const updateTableTriggerResult = await request(app.getHttpServer())
    .put(`/table/triggers/${createConnectionRO.id}?triggersId=${createTableTriggerRO.id}&tableName=${testTableName}`)
    .send(updateTableTriggerDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const updateTableTriggerRO = JSON.parse(updateTableTriggerResult.text);
  t.is(updateTableTriggerResult.status, 200);
  t.is(typeof updateTableTriggerRO, 'object');
  t.is(updateTableTriggerRO.hasOwnProperty('id'), true);
  t.is(updateTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(updateTableTriggerRO.hasOwnProperty('table_actions'), true);
  t.is(updateTableTriggerRO.hasOwnProperty('created_at'), true);
  t.is(updateTableTriggerRO.table_actions.length, 1);
  t.is(updateTableTriggerRO.table_actions[0].id, createSecondTableActionRO.id);
  t.is(updateTableTriggerRO.table_actions[0].title, newTableAction.title);
  t.is(updateTableTriggerRO.table_actions[0].type, newTableAction.type);
  t.is(updateTableTriggerRO.table_actions[0].url, newTableAction.url);
  t.is(updateTableTriggerRO.table_actions[0].hasOwnProperty('id'), true);
});

currentTest = 'DELETE /table/triggers/:connectionId';

test(`${currentTest} should return found table triggers`, async (t) => {
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

  const createFirstTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createSecondTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createFirstTableActionRO = JSON.parse(createFirstTableActionResult.text);
  const createSecondTableActionRO = JSON.parse(createSecondTableActionResult.text);
  // create table trigger

  const tableTriggerDTO: CreateTableTriggersBodyDTO = {
    actions_ids: [createFirstTableActionRO.id],
    trigger_events: [TableTriggerEventEnum.ADD_ROW, TableTriggerEventEnum.UPDATE_ROW],
  };

  const createFirstTableTriggerResult = await request(app.getHttpServer())
    .post(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(tableTriggerDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createSecondTableTriggerResult = await request(app.getHttpServer())
    .post(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(tableTriggerDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createFirstTableTriggerRO = JSON.parse(createFirstTableTriggerResult.text);
  const createSecondTableTriggerRO = JSON.parse(createSecondTableTriggerResult.text);
  t.is(createFirstTableTriggerResult.status, 201);
  t.is(createSecondTableTriggerResult.status, 201);

  // get table triggers
  const getTableTriggersResult = await request(app.getHttpServer())
    .get(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const getTableTriggersRO = JSON.parse(getTableTriggersResult.text);
  t.is(getTableTriggersResult.status, 200);

  t.is(typeof getTableTriggersRO, 'object');
  t.is(getTableTriggersRO.length, 2);

  // delete table triggers

  const deleteFirstTableTriggerResult = await request(app.getHttpServer())
    .delete(`/table/triggers/${createConnectionRO.id}?triggersId=${createFirstTableTriggerRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(deleteFirstTableTriggerResult.status, 200);
  const deleteFirstTableTriggerRO = JSON.parse(deleteFirstTableTriggerResult.text);
  t.is(deleteFirstTableTriggerRO.hasOwnProperty('id'), true);
  t.is(deleteFirstTableTriggerRO.hasOwnProperty('trigger_events'), true);
  t.is(deleteFirstTableTriggerRO.hasOwnProperty('table_actions'), true);
  t.is(deleteFirstTableTriggerRO.hasOwnProperty('created_at'), true);
  t.is(deleteFirstTableTriggerRO.table_actions.length, 1);
  t.is(deleteFirstTableTriggerRO.table_actions[0].id, createFirstTableActionRO.id);
  t.is(deleteFirstTableTriggerRO.table_actions[0].title, newTableAction.title);
  t.is(deleteFirstTableTriggerRO.table_actions[0].type, newTableAction.type);
  t.is(deleteFirstTableTriggerRO.table_actions[0].url, newTableAction.url);
  t.is(deleteFirstTableTriggerRO.table_actions[0].hasOwnProperty('id'), true);

  // get table triggers (check that trigger was deleted)

  const getTableTriggersAfterDeleteResult = await request(app.getHttpServer())
    .get(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const getTableTriggersAfterDeleteRO = JSON.parse(getTableTriggersAfterDeleteResult.text);
  t.is(getTableTriggersAfterDeleteResult.status, 200);
  t.is(typeof getTableTriggersAfterDeleteRO, 'object');
  t.is(getTableTriggersAfterDeleteRO.length, 1);
});

//check that table action (webhook) was triggered on add row
currentTest = 'POST/PUT/DELETE /table/row/:slug';

test(`${currentTest} should create trigger and activate http table action on add row`, async (t) => {
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
  const actionCopy = { ...newTableAction };
  actionCopy.url = 'http://localhost:3000';
  const createTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(actionCopy)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 201);

  // create table trigger

  const tableTriggerDTO: CreateTableTriggersBodyDTO = {
    actions_ids: [createTableActionRO.id],
    trigger_events: [TableTriggerEventEnum.ADD_ROW, TableTriggerEventEnum.UPDATE_ROW, TableTriggerEventEnum.DELETE_ROW],
  };

  const createTableTriggerResult = await request(app.getHttpServer())
    .post(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(tableTriggerDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(createTableTriggerResult.status, 201);

  // add row to table

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTAbleSecondColumnName]: fakeMail,
  };

  // check that table action will be triggered
  const nockBodiesArray = [];
  const scope = nock(actionCopy.url)
    .post('/')
    .times(3)
    .reply(201, (uri, requestBody) => {
      t.is(requestBody.hasOwnProperty('$$_raUserId'), true);
      t.is(requestBody.hasOwnProperty('primaryKeys'), true);
      t.is(requestBody.hasOwnProperty('$$_date'), true);
      t.is(requestBody.hasOwnProperty('$$_actionId'), true);
      t.is(requestBody.hasOwnProperty('$$_tableName'), true);
      nockBodiesArray.push(requestBody);
      return {
        status: 201,
        message: 'Table action was triggered',
      };
    });

  // trigger add row

  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(JSON.stringify(row))
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(addRowInTableResponse.status, 201);

  // trigger update row

  const updatedRow = {
    [testTableColumnName]: fakeName,
    [testTAbleSecondColumnName]: fakeMail,
  };

  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=1`)
    .send(JSON.stringify(updatedRow))
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(updateRowInTableResponse.status, 200);

  // trigger delete row

  const idForDeletion = 1;
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForDeletion}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(deleteRowInTableResponse.status, 200);

  t.is(nockBodiesArray.length, 3);
  for (const body of nockBodiesArray) {
    t.is(body.hasOwnProperty('$$_raUserId'), true);
    t.is(body.hasOwnProperty('primaryKeys'), true);
    t.is(body.hasOwnProperty('$$_date'), true);
    t.is(body.hasOwnProperty('$$_actionId'), true);
    t.is(body.hasOwnProperty('$$_tableName'), true);
  }

  const bodiesWithNonEmptyPrimaryKeysObjects = nockBodiesArray.filter(
    (body) => Object.keys(body.primaryKeys).length > 0,
  );
  t.is(bodiesWithNonEmptyPrimaryKeysObjects.length, 3);

  scope.done();
});

//check that table action (slack message) was triggered on add row

test(`${currentTest} should create trigger and activate slack table action on add row`, async (t) => {
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
  const newTableActionDto = new CreateTableActionDTO();

  newTableActionDto.title = 'Send slack message';
  newTableActionDto.type = TableActionTypeEnum.multiple;
  newTableActionDto.slack_url = 'https://slack.com/api/chat.postMessage';
  newTableActionDto.method = TableActionMethodEnum.SLACK;

  const createTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableActionDto)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 201);

  // create table trigger

  const tableTriggerDTO: CreateTableTriggersBodyDTO = {
    actions_ids: [createTableActionRO.id],
    trigger_events: [TableTriggerEventEnum.ADD_ROW, TableTriggerEventEnum.UPDATE_ROW, TableTriggerEventEnum.DELETE_ROW],
  };

  const createTableTriggerResult = await request(app.getHttpServer())
    .post(`/table/triggers/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(tableTriggerDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(createTableTriggerResult.status, 201);

  // add row to table

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTAbleSecondColumnName]: fakeMail,
  };

  // check that table action will be triggered
  const nockBodiesArray = [];
  const scope = nock('https://slack.com')
    .post('/api/chat.postMessage')
    .times(3)
    .reply(201, (uri, requestBody) => {
      nockBodiesArray.push(requestBody);
      return {
        status: 201,
        message: 'Table action was triggered',
      };
    });

  // trigger add row

  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(JSON.stringify(row))
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(addRowInTableResponse.status, 201);

  // trigger update row

  const updatedRow = {
    [testTableColumnName]: fakeName,
    [testTAbleSecondColumnName]: fakeMail,
  };

  const updateRowInTableResponse = await request(app.getHttpServer())
    .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=10`)
    .send(JSON.stringify(updatedRow))
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const updateRowInTableResponseRO = JSON.parse(updateRowInTableResponse.text);
  t.is(updateRowInTableResponse.status, 200);

  // trigger delete row

  const idForDeletion = 5;
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForDeletion}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(deleteRowInTableResponse.status, 200);

  t.is(nockBodiesArray.length, 3);
  for (const body of nockBodiesArray) {
    t.is(body.hasOwnProperty('text'), true);
    t.is(body.text.length > 0, true);
  }

  scope.done();
});
