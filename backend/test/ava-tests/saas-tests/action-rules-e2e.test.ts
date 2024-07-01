/* eslint-disable @typescript-eslint/no-unused-vars */
import { fa, faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import knex from 'knex';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { CreateTableActionRuleBodyDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/create-action-rules-with-actions-and-events-body.dto.js';
import { TableActionEventEnum } from '../../../src/enums/table-action-event-enum.js';
import { TableActionTypeEnum } from '../../../src/enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../src/enums/table-action-method-enum.js';
import { FoundActionEventDTO, FoundActionRulesWithActionsAndEventsDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';
import { UpdateTableActionRuleBodyDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/update-action-rule-with-actions-and-events.dto.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let newConnection;
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

let currentTest = `POST /action/rule/:connectionId`;

test(`${currentTest} should return created table rule with action and events`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        type: TableActionTypeEnum.multiple,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
    ],
  };

  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(createTableRuleResult.text);
  t.is(createTableRuleResult.status, 201);

  t.truthy(createTableRuleRO.id);
  t.is(createTableRuleRO.title, tableRuleDTO.title);
  t.is(createTableRuleRO.table_name, tableRuleDTO.table_name);
  t.is(createTableRuleRO.table_actions.length, tableRuleDTO.table_actions.length);
  t.is(createTableRuleRO.events.length, tableRuleDTO.events.length);
  const createdCustomEvent = createTableRuleRO.events.find((event) => event.event === TableActionEventEnum.CUSTOM);
  t.truthy(createdCustomEvent);
  t.is(createdCustomEvent.title, tableRuleDTO.events[0].title);
  t.is(createdCustomEvent.icon, tableRuleDTO.events[0].icon);
  t.is(createdCustomEvent.require_confirmation, tableRuleDTO.events[0].require_confirmation);
  const createdAddRowEvent = createTableRuleRO.events.find((event) => event.event === TableActionEventEnum.ADD_ROW);
  t.truthy(createdAddRowEvent);
  t.is(createdAddRowEvent.title, tableRuleDTO.events[1].title);
  t.is(createdAddRowEvent.icon, tableRuleDTO.events[1].icon);
  t.is(createdAddRowEvent.require_confirmation, tableRuleDTO.events[1].require_confirmation);
  const createdMultipleAction = createTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple,
  );
  t.truthy(createdMultipleAction);
  t.is(createdMultipleAction.url, tableRuleDTO.table_actions[0].url);
  t.is(createdMultipleAction.method, tableRuleDTO.table_actions[0].method);
  t.is(createdMultipleAction.slack_url, null);
  t.is(createdMultipleAction.emails.length, tableRuleDTO.table_actions[0].emails.length);
  const createdSingleAction = createTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.single,
  );
  t.truthy(createdSingleAction);
  t.is(createdSingleAction.url, null);
  t.is(createdSingleAction.method, tableRuleDTO.table_actions[1].method);
  t.truthy(createdSingleAction.slack_url);
  t.deepEqual(createdSingleAction.emails, []);
});

currentTest = `GET /action/rules/:connectionId`;

test(`${currentTest} should return found table rules with action and events`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        type: TableActionTypeEnum.multiple,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
    ],
  };

  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(createTableRuleResult.status, 201);

  const findTableRuleResult = await request(app.getHttpServer())
    .get(`/action/rules/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableRulesRO: Array<FoundActionRulesWithActionsAndEventsDTO> = JSON.parse(findTableRuleResult.text);

  t.is(findTableRuleResult.status, 200);

  t.is(findTableRulesRO.length, 1);
  const findTableRuleRO = findTableRulesRO[0];

  t.truthy(findTableRuleRO.id);
  t.is(findTableRuleRO.title, tableRuleDTO.title);
  t.is(findTableRuleRO.table_name, tableRuleDTO.table_name);
  t.is(findTableRuleRO.table_actions.length, tableRuleDTO.table_actions.length);
  t.is(findTableRuleRO.events.length, tableRuleDTO.events.length);
  const foundCustomEvent = findTableRuleRO.events.find((event) => event.event === TableActionEventEnum.CUSTOM);
  t.truthy(foundCustomEvent);
  t.is(foundCustomEvent.title, tableRuleDTO.events[0].title);
  t.is(foundCustomEvent.icon, tableRuleDTO.events[0].icon);
  t.is(foundCustomEvent.require_confirmation, tableRuleDTO.events[0].require_confirmation);
  const foundAddRowEvent = findTableRuleRO.events.find((event) => event.event === TableActionEventEnum.ADD_ROW);
  t.truthy(foundAddRowEvent);
  t.is(foundAddRowEvent.title, tableRuleDTO.events[1].title);
  t.is(foundAddRowEvent.icon, tableRuleDTO.events[1].icon);
  t.is(foundAddRowEvent.require_confirmation, tableRuleDTO.events[1].require_confirmation);
  const foundMultipleAction = findTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple,
  );
  t.truthy(foundMultipleAction);
  t.is(foundMultipleAction.url, tableRuleDTO.table_actions[0].url);
  t.is(foundMultipleAction.method, tableRuleDTO.table_actions[0].method);
  t.is(foundMultipleAction.slack_url, null);
  t.is(foundMultipleAction.emails.length, tableRuleDTO.table_actions[0].emails.length);
  const foundSingleAction = findTableRuleRO.table_actions.find((action) => action.type === TableActionTypeEnum.single);
  t.truthy(foundSingleAction);
  t.is(foundSingleAction.url, null);
  t.is(foundSingleAction.method, tableRuleDTO.table_actions[1].method);
  t.truthy(foundSingleAction.slack_url);
  t.deepEqual(foundSingleAction.emails, []);
});

currentTest = `/action/events/custom/:connectionId`;

test(`${currentTest} should return found table custom action events`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        type: TableActionTypeEnum.multiple,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
    ],
  };

  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(createTableRuleResult.status, 201);

  const findCustomEventsResult = await request(app.getHttpServer())
    .get(`/action/events/custom/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findActionCustomEvents: Array<FoundActionEventDTO> = JSON.parse(findCustomEventsResult.text);
  t.is(findCustomEventsResult.status, 200);
  t.is(findActionCustomEvents.length, 1);
  const foundCustomEvent = findActionCustomEvents[0];
  t.truthy(foundCustomEvent.id);
  t.is(foundCustomEvent.event, TableActionEventEnum.CUSTOM);
  t.is(foundCustomEvent.title, tableRuleDTO.events[0].title);
  t.is(foundCustomEvent.icon, tableRuleDTO.events[0].icon);
  t.is(foundCustomEvent.require_confirmation, tableRuleDTO.events[0].require_confirmation);
});

currentTest = `DELETE /action/rule/:actionId/:connectionId`;

test(`${currentTest} should delete table action rule with action and events and return deleted result`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        type: TableActionTypeEnum.multiple,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
    ],
  };

  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(createTableRuleResult.text);
  t.is(createTableRuleResult.status, 201);

  const deleteTableRuleResult = await request(app.getHttpServer())
    .delete(`/action/rule/${createTableRuleRO.id}/${createConnectionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const deleteTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(deleteTableRuleResult.text);
  t.is(deleteTableRuleResult.status, 200);

  t.truthy(deleteTableRuleRO.id);
  t.is(deleteTableRuleRO.title, tableRuleDTO.title);
  t.is(deleteTableRuleRO.table_name, tableRuleDTO.table_name);
  t.is(deleteTableRuleRO.table_actions.length, tableRuleDTO.table_actions.length);
  t.is(deleteTableRuleRO.events.length, tableRuleDTO.events.length);
  const deletedCustomEvent = deleteTableRuleRO.events.find((event) => event.event === TableActionEventEnum.CUSTOM);
  t.truthy(deletedCustomEvent);
  t.is(deletedCustomEvent.title, tableRuleDTO.events[0].title);
  t.is(deletedCustomEvent.icon, tableRuleDTO.events[0].icon);
  t.is(deletedCustomEvent.require_confirmation, tableRuleDTO.events[0].require_confirmation);
  const deletedAddRowEvent = deleteTableRuleRO.events.find((event) => event.event === TableActionEventEnum.ADD_ROW);
  t.truthy(deletedAddRowEvent);
  t.is(deletedAddRowEvent.title, tableRuleDTO.events[1].title);
  t.is(deletedAddRowEvent.icon, tableRuleDTO.events[1].icon);
  t.is(deletedAddRowEvent.require_confirmation, tableRuleDTO.events[1].require_confirmation);
  const deletedMultipleAction = deleteTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple,
  );
  t.truthy(deletedMultipleAction);
  t.is(deletedMultipleAction.url, tableRuleDTO.table_actions[0].url);
  t.is(deletedMultipleAction.method, tableRuleDTO.table_actions[0].method);
  t.is(deletedMultipleAction.slack_url, null);
  t.is(deletedMultipleAction.emails.length, tableRuleDTO.table_actions[0].emails.length);
  const deletedSingleAction = deleteTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.single,
  );
  t.truthy(deletedSingleAction);
  t.is(deletedSingleAction.url, null);
  t.is(deletedSingleAction.method, tableRuleDTO.table_actions[1].method);
  t.truthy(deletedSingleAction.slack_url);
  t.deepEqual(deletedSingleAction.emails, []);

  // Check if the rule is deleted
  const findTableRuleResult = await request(app.getHttpServer())
    .get(`/action/rules/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableRulesRO: Array<FoundActionRulesWithActionsAndEventsDTO> = JSON.parse(findTableRuleResult.text);

  t.is(findTableRuleResult.status, 200);

  t.is(findTableRulesRO.length, 0);
});

currentTest = `GET /action/rule/:actionId/:connectionId`;

test(`${currentTest} should delete table action rule with action and events and return deleted result`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        type: TableActionTypeEnum.multiple,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
    ],
  };
  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(createTableRuleResult.text);
  t.is(createTableRuleResult.status, 201);

  const getTableRuleResult = await request(app.getHttpServer())
    .get(`/action/rule/${createTableRuleRO.id}/${createConnectionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(getTableRuleResult.text);
  t.is(getTableRuleResult.status, 200);

  t.truthy(findTableRuleRO.id);
  t.is(findTableRuleRO.title, tableRuleDTO.title);
  t.is(findTableRuleRO.table_name, tableRuleDTO.table_name);
  t.is(findTableRuleRO.table_actions.length, tableRuleDTO.table_actions.length);
  t.is(findTableRuleRO.events.length, tableRuleDTO.events.length);
  const foundCustomEvent = findTableRuleRO.events.find((event) => event.event === TableActionEventEnum.CUSTOM);
  t.truthy(foundCustomEvent);
  t.is(foundCustomEvent.title, tableRuleDTO.events[0].title);
  t.is(foundCustomEvent.icon, tableRuleDTO.events[0].icon);
  t.is(foundCustomEvent.require_confirmation, tableRuleDTO.events[0].require_confirmation);
  const foundAddRowEvent = findTableRuleRO.events.find((event) => event.event === TableActionEventEnum.ADD_ROW);
  t.truthy(foundAddRowEvent);
  t.is(foundAddRowEvent.title, tableRuleDTO.events[1].title);
  t.is(foundAddRowEvent.icon, tableRuleDTO.events[1].icon);
  t.is(foundAddRowEvent.require_confirmation, tableRuleDTO.events[1].require_confirmation);
  const foundMultipleAction = findTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple,
  );
  t.truthy(foundMultipleAction);
  t.is(foundMultipleAction.url, tableRuleDTO.table_actions[0].url);
  t.is(foundMultipleAction.method, tableRuleDTO.table_actions[0].method);
  t.is(foundMultipleAction.slack_url, null);
  t.is(foundMultipleAction.emails.length, tableRuleDTO.table_actions[0].emails.length);
  const foundSingleAction = findTableRuleRO.table_actions.find((action) => action.type === TableActionTypeEnum.single);
  t.truthy(foundSingleAction);
  t.is(foundSingleAction.url, null);
  t.is(foundSingleAction.method, tableRuleDTO.table_actions[1].method);
  t.truthy(foundSingleAction.slack_url);
  t.deepEqual(foundSingleAction.emails, []);
});

currentTest = `PUT /action/rule/:actionId/:connectionId`;

test(`${currentTest} should return created table rule with action and events`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        type: TableActionTypeEnum.multiple,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.ZAPIER,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
    ],
  };

  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(createTableRuleResult.status, 201);

  const createTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(createTableRuleResult.text);
  const customEventId = createTableRuleRO.events.find((event) => event.event === TableActionEventEnum.CUSTOM).id;
  const addRowEventId = createTableRuleRO.events.find((event) => event.event === TableActionEventEnum.ADD_ROW).id;
  const multipleActionId = createTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple,
  ).id;
  const singleActionId = createTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.single,
  ).id;
  const createTableRuleROId = createTableRuleRO.id;
  const createdZapierAction = createTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.single && action.method === TableActionMethodEnum.ZAPIER,
  );
  t.truthy(createdZapierAction);

  const updateTableRuleDTO: UpdateTableActionRuleBodyDTO = {
    title: 'Test rule updated',
    table_name: testTableName,
    events: [
      {
        id: customEventId,
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event updated',
        icon: 'test-icon updated',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.DELETE_ROW,
        title: 'Test event 3 created',
        icon: 'test-icon 3 created',
        require_confirmation: false,
      },
    ],
    table_actions: [
      {
        id: multipleActionId,
        type: TableActionTypeEnum.multiple,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
      {
        type: TableActionTypeEnum.single,
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
    ],
  };

  const updateTableRuleResult = await request(app.getHttpServer())
    .put(`/action/rule/${createTableRuleROId}/${createConnectionRO.id}`)
    .send(updateTableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const updateTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(updateTableRuleResult.text);
  t.is(updateTableRuleResult.status, 200);

  t.truthy(updateTableRuleRO.id);
  t.is(updateTableRuleRO.title, updateTableRuleDTO.title);
  t.is(updateTableRuleRO.table_name, updateTableRuleDTO.table_name);
  t.is(updateTableRuleRO.table_actions.length, updateTableRuleDTO.table_actions.length);
  t.is(updateTableRuleRO.events.length, updateTableRuleDTO.events.length);
  const updatedCustomEvent = updateTableRuleRO.events.find((event) => event.event === TableActionEventEnum.CUSTOM);
  t.truthy(updatedCustomEvent);
  t.is(updatedCustomEvent.title, updateTableRuleDTO.events[0].title);
  t.is(updatedCustomEvent.icon, updateTableRuleDTO.events[0].icon);
  t.is(updatedCustomEvent.require_confirmation, updateTableRuleDTO.events[0].require_confirmation);
  const deletedAddRowEvent = updateTableRuleRO.events.find((event) => event.event === TableActionEventEnum.ADD_ROW);
  t.falsy(deletedAddRowEvent);

  const createdDeleteRowEvent = updateTableRuleRO.events.find(
    (event) => event.event === TableActionEventEnum.DELETE_ROW,
  );
  t.truthy(createdDeleteRowEvent);
  t.is(createdDeleteRowEvent.title, updateTableRuleDTO.events[1].title);
  t.is(createdDeleteRowEvent.icon, updateTableRuleDTO.events[1].icon);
  t.is(createdDeleteRowEvent.require_confirmation, updateTableRuleDTO.events[1].require_confirmation);
  const updatedMultipleAction = updateTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple && action.method === TableActionMethodEnum.URL,
  );
  t.truthy(updatedMultipleAction);
  t.is(updatedMultipleAction.url, updateTableRuleDTO.table_actions[0].url);
  t.is(updatedMultipleAction.method, updateTableRuleDTO.table_actions[0].method);
  t.is(updatedMultipleAction.slack_url, null);
  t.is(updatedMultipleAction.emails.length, updateTableRuleDTO.table_actions[0].emails.length);

  const createdSlackActions = updateTableRuleRO.table_actions.filter(
    (action) => action.type === TableActionTypeEnum.single && action.method === TableActionMethodEnum.SLACK,
  );
  t.is(createdSlackActions.length, 2);
  t.truthy(createdSlackActions[0].slack_url);
  t.deepEqual(createdSlackActions[0].emails, []);
  t.truthy(createdSlackActions[1].slack_url);
  t.deepEqual(createdSlackActions[1].emails, []);

  const deletedZapierAction = updateTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.single && action.method === TableActionMethodEnum.ZAPIER,
  );
  t.falsy(deletedZapierAction);

  // Check if the rule is updated

  const findTableRuleResult = await request(app.getHttpServer())
    .get(`/action/rules/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableRulesRO: Array<FoundActionRulesWithActionsAndEventsDTO> = JSON.parse(findTableRuleResult.text);

  t.is(findTableRuleResult.status, 200);
  t.is(findTableRulesRO.length, 1);
  const findTableRuleRO = findTableRulesRO[0];

  t.truthy(findTableRuleRO.id);
  t.is(findTableRuleRO.title, updateTableRuleDTO.title);
  t.is(findTableRuleRO.table_name, updateTableRuleDTO.table_name);
  t.is(findTableRuleRO.table_actions.length, updateTableRuleDTO.table_actions.length);
  t.is(findTableRuleRO.events.length, updateTableRuleDTO.events.length);
  const foundCustomEvent = findTableRuleRO.events.find((event) => event.event === TableActionEventEnum.CUSTOM);
  t.truthy(foundCustomEvent);
  t.is(foundCustomEvent.title, updateTableRuleDTO.events[0].title);
  t.is(foundCustomEvent.icon, updateTableRuleDTO.events[0].icon);
  t.is(foundCustomEvent.require_confirmation, updateTableRuleDTO.events[0].require_confirmation);
  const foundDeleteRowEvent = findTableRuleRO.events.find((event) => event.event === TableActionEventEnum.DELETE_ROW);
  t.truthy(foundDeleteRowEvent);
  t.is(foundDeleteRowEvent.title, updateTableRuleDTO.events[1].title);
  t.is(foundDeleteRowEvent.icon, updateTableRuleDTO.events[1].icon);
  t.is(foundDeleteRowEvent.require_confirmation, updateTableRuleDTO.events[1].require_confirmation);
  const foundMultipleAction = findTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple && action.method === TableActionMethodEnum.URL,
  );
  t.truthy(foundMultipleAction);
  t.is(foundMultipleAction.url, updateTableRuleDTO.table_actions[0].url);
  t.is(foundMultipleAction.method, updateTableRuleDTO.table_actions[0].method);
  t.is(foundMultipleAction.slack_url, null);
  t.is(foundMultipleAction.emails.length, updateTableRuleDTO.table_actions[0].emails.length);
  const foundSlackActions = findTableRuleRO.table_actions.filter(
    (action) => action.type === TableActionTypeEnum.single && action.method === TableActionMethodEnum.SLACK,
  );
  t.is(foundSlackActions.length, 2);
  t.truthy(foundSlackActions[0].slack_url);
  t.deepEqual(foundSlackActions[0].emails, []);
  t.truthy(foundSlackActions[1].slack_url);
  t.deepEqual(foundSlackActions[1].emails, []);
  const foundZapierAction = findTableRuleRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.single && action.method === TableActionMethodEnum.ZAPIER,
  );
  t.falsy(foundZapierAction);
});
