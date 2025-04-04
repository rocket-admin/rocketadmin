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
import {
  FoundActionEventDTO,
  FoundActionRulesWithActionsAndEventsDTO,
} from '../../../src/entities/table-actions/table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';
import { UpdateTableActionRuleBodyDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/update-action-rule-with-actions-and-events.dto.js';
import { ActivatedTableActionsDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/activated-table-actions.dto.js';
import nock from 'nock';
import { CreateConnectionDto } from '../../../src/entities/connection/application/dto/create-connection.dto.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { FoundTableActionRulesRoDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/found-table-action-rules.ro.dto.js';

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
  await Knex.schema.dropTableIfExists('transactions');
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

async function deleteTable(tableName: string): Promise<void> {
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
  await Knex.schema.dropTableIfExists(tableName);
  await Knex.destroy();
}

async function resetPostgresTestDbTableCompositePrimaryKeys(
  secondTestTableName: string,
  secondTableCompositeKeyName: string,
): Promise<void> {
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
  await Knex.schema.dropTableIfExists(secondTestTableName);
  await Knex.schema.createTableIfNotExists(secondTestTableName, function (table) {
    table.increments('id');
    table.string(testTableColumnName);
    table.string(testTAbleSecondColumnName);
    table.string(secondTableCompositeKeyName);
    table.primary(['id', secondTableCompositeKeyName]);
    table.timestamps();
  });

  for (let i = 0; i < testEntitiesSeedsCount; i++) {
    if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
      await Knex(secondTestTableName).insert({
        [testTableColumnName]: testSearchedUserName,
        [testTAbleSecondColumnName]: faker.internet.email(),
        [secondTableCompositeKeyName]: faker.string.uuid(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      await Knex(secondTestTableName).insert({
        [testTableColumnName]: faker.person.firstName(),
        [testTAbleSecondColumnName]: faker.internet.email(),
        [secondTableCompositeKeyName]: faker.string.uuid(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }
  await Knex.destroy();
}

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
});

let currentTest = `POST /action/rule/:connectionId`;

test.serial(`${currentTest} should return created table rule with action and events`, async (t) => {
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
        type: TableActionTypeEnum.single,
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        event: TableActionEventEnum.ADD_ROW,
        type: TableActionTypeEnum.multiple,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
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

  const createdUrlAction = createTableRuleRO.table_actions.find(
    (action) => action.method === TableActionMethodEnum.URL,
  );
  t.truthy(createdUrlAction);
  t.is(createdUrlAction.url, tableRuleDTO.table_actions[0].url);
  t.is(createdUrlAction.method, tableRuleDTO.table_actions[0].method);
  t.is(createdUrlAction.slack_url, null);
  t.is(createdUrlAction.emails.length, tableRuleDTO.table_actions[0].emails.length);
  const createdSlackAction = createTableRuleRO.table_actions.find(
    (action) => action.method === TableActionMethodEnum.SLACK,
  );
  t.truthy(createdSlackAction);
  t.is(createdSlackAction.url, null);
  t.is(createdSlackAction.method, tableRuleDTO.table_actions[1].method);
  t.truthy(createdSlackAction.slack_url);
  t.deepEqual(createdSlackAction.emails, []);
});

test.serial(`${currentTest} throw validation exceptions when create dto includes null values`, async (t) => {
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
      null,
      {
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.ADD_ROW,
        title: undefined,
        icon: null,
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        url: faker.internet.url(),
        method: 'wrong-method' as any,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
      null,
    ],
  };

  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableRuleRO = JSON.parse(createTableRuleResult.text);
  t.is(createTableRuleResult.status, 400);
  const { message } = createTableRuleRO;
  t.truthy(message);
  t.truthy(message.includes('each value in table_actions must be an object'));
  t.truthy(message.includes('each value in events must be an object'));
  t.truthy(message.includes('each value in events should not be empty'));
  t.truthy(message.includes('each value in table_actions should not be empty'));
});

test.serial(`${currentTest} throw validation exceptions when create dto includes wrong values`, async (t) => {
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
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.ADD_ROW,
        title: undefined,
        icon: null,
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        url: faker.internet.url(),
        method: 'wrong-method' as any,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
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

  const createTableRuleRO = JSON.parse(createTableRuleResult.text);
  t.is(createTableRuleResult.status, 400);
  const { message } = createTableRuleRO;
  t.truthy(message);
  t.truthy(message.includes('Invalid action method wrong-method'));
});

currentTest = `GET /action/rules/:connectionId`;

test.serial(`${currentTest} should return found table rules with action and events`, async (t) => {
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
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        type: TableActionTypeEnum.multiple,
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
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

  const findTableRulesRO: FoundTableActionRulesRoDTO = JSON.parse(findTableRuleResult.text);

  t.is(findTableRuleResult.status, 200);

  t.is(findTableRulesRO.action_rules.length, 1);
  const findTableRuleRO = findTableRulesRO.action_rules[0];

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
  const foundUrlAction = findTableRuleRO.table_actions.find((action) => action.method === TableActionMethodEnum.URL);
  t.truthy(foundUrlAction);
  t.is(foundUrlAction.url, tableRuleDTO.table_actions[0].url);
  t.is(foundUrlAction.method, tableRuleDTO.table_actions[0].method);
  t.is(foundUrlAction.slack_url, null);
  t.is(foundUrlAction.emails.length, tableRuleDTO.table_actions[0].emails.length);
  const foundSlackAction = findTableRuleRO.table_actions.find(
    (action) => action.method === TableActionMethodEnum.SLACK,
  );
  t.truthy(foundSlackAction);
  t.is(foundSlackAction.url, null);
  t.is(foundSlackAction.method, tableRuleDTO.table_actions[1].method);
  t.truthy(foundSlackAction.slack_url);
  t.deepEqual(foundSlackAction.emails, []);
});

currentTest = `/action/events/custom/:connectionId`;

test.serial(`${currentTest} should return found table custom action events`, async (t) => {
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
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        type: TableActionTypeEnum.multiple,
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
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

test.serial(
  `${currentTest} should delete table action rule with action and events and return deleted result`,
  async (t) => {
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
          type: TableActionTypeEnum.single,
          event: TableActionEventEnum.CUSTOM,
          title: 'Test event',
          icon: 'test-icon',
          require_confirmation: false,
        },
        {
          type: TableActionTypeEnum.multiple,
          event: TableActionEventEnum.ADD_ROW,
          title: 'Test event 2',
          icon: 'test-icon 2',
          require_confirmation: true,
        },
      ],
      table_actions: [
        {
          url: faker.internet.url(),
          method: TableActionMethodEnum.URL,
          slack_url: undefined,
          emails: [faker.internet.email()],
        },
        {
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

    const deletedSlackAction = deleteTableRuleRO.table_actions.find(
      (action) => action.method === TableActionMethodEnum.URL,
    );
    t.truthy(deletedSlackAction);
    t.is(deletedSlackAction.url, tableRuleDTO.table_actions[0].url);
    t.is(deletedSlackAction.method, tableRuleDTO.table_actions[0].method);
    t.is(deletedSlackAction.slack_url, null);
    t.is(deletedSlackAction.emails.length, tableRuleDTO.table_actions[0].emails.length);

    const deletedUrlAction = deleteTableRuleRO.table_actions.find(
      (action) => action.method === TableActionMethodEnum.SLACK,
    );
    t.truthy(deletedUrlAction);
    t.is(deletedUrlAction.url, null);
    t.is(deletedUrlAction.method, tableRuleDTO.table_actions[1].method);
    t.truthy(deletedUrlAction.slack_url);
    t.deepEqual(deletedUrlAction.emails, []);

    // Check if the rule is deleted
    const findTableRuleResult = await request(app.getHttpServer())
      .get(`/action/rules/${createConnectionRO.id}?tableName=${testTableName}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const findTableRulesRO: FoundTableActionRulesRoDTO = JSON.parse(findTableRuleResult.text);

    t.is(findTableRuleResult.status, 200);

    t.is(findTableRulesRO.action_rules.length, 0);
  },
);

currentTest = `GET /action/rule/:actionId/:connectionId`;

test.serial(
  `${currentTest} should delete table action rule with action and events and return deleted result`,
  async (t) => {
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
          type: TableActionTypeEnum.single,
          event: TableActionEventEnum.CUSTOM,
          title: 'Test event',
          icon: 'test-icon',
          require_confirmation: false,
        },
        {
          type: TableActionTypeEnum.multiple,
          event: TableActionEventEnum.ADD_ROW,
          title: 'Test event 2',
          icon: 'test-icon 2',
          require_confirmation: true,
        },
      ],
      table_actions: [
        {
          url: faker.internet.url(),
          method: TableActionMethodEnum.URL,
          slack_url: undefined,
          emails: [faker.internet.email()],
        },
        {
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
    const foundUrlAction = findTableRuleRO.table_actions.find((action) => action.method === TableActionMethodEnum.URL);
    t.truthy(foundUrlAction);
    t.is(foundUrlAction.url, tableRuleDTO.table_actions[0].url);
    t.is(foundUrlAction.method, tableRuleDTO.table_actions[0].method);
    t.is(foundUrlAction.slack_url, null);
    t.is(foundUrlAction.emails.length, tableRuleDTO.table_actions[0].emails.length);
    const foundSlackAction = findTableRuleRO.table_actions.find(
      (action) => action.method === TableActionMethodEnum.SLACK,
    );
    t.truthy(foundSlackAction);
    t.is(foundSlackAction.url, null);
    t.is(foundSlackAction.method, tableRuleDTO.table_actions[1].method);
    t.truthy(foundSlackAction.slack_url);
    t.deepEqual(foundSlackAction.emails, []);
  },
);

currentTest = `PUT /action/rule/:actionId/:connectionId`;

test.serial(`${currentTest} should return created table rule with action and events`, async (t) => {
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
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        type: TableActionTypeEnum.multiple,
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event 2',
        icon: 'test-icon 2',
        require_confirmation: true,
      },
    ],
    table_actions: [
      {
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
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
  const urlActionId = createTableRuleRO.table_actions.find((action) => action.method === TableActionMethodEnum.URL).id;

  const createTableRuleROId = createTableRuleRO.id;
  const createdZapierAction = createTableRuleRO.table_actions.find(
    (action) => action.method === TableActionMethodEnum.ZAPIER,
  );
  t.truthy(createdZapierAction);

  const updateTableRuleDTO: UpdateTableActionRuleBodyDTO = {
    title: 'Test rule updated',
    table_name: testTableName,
    events: [
      {
        type: TableActionTypeEnum.single,
        id: customEventId,
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event updated',
        icon: 'test-icon updated',
        require_confirmation: false,
      },
      {
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.DELETE_ROW,
        title: 'Test event 3 created',
        icon: 'test-icon 3 created',
        require_confirmation: false,
      },
    ],
    table_actions: [
      {
        id: urlActionId,
        url: faker.internet.url(),
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [faker.internet.email()],
      },
      {
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: faker.internet.url(),
        emails: undefined,
      },
      {
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
  const updatedMultipleAction = updateTableRuleRO.table_actions.find((action) => action.id === urlActionId);
  t.truthy(updatedMultipleAction);
  t.is(updatedMultipleAction.url, updateTableRuleDTO.table_actions[0].url);
  t.is(updatedMultipleAction.method, updateTableRuleDTO.table_actions[0].method);
  t.is(updatedMultipleAction.slack_url, null);
  t.is(updatedMultipleAction.emails.length, updateTableRuleDTO.table_actions[0].emails.length);

  const createdSlackActions = updateTableRuleRO.table_actions.filter(
    (action) => action.method === TableActionMethodEnum.SLACK,
  );
  t.is(createdSlackActions.length, 2);
  t.truthy(createdSlackActions[0].slack_url);
  t.deepEqual(createdSlackActions[0].emails, []);
  t.truthy(createdSlackActions[1].slack_url);
  t.deepEqual(createdSlackActions[1].emails, []);

  const deletedZapierAction = updateTableRuleRO.table_actions.find(
    (action) => action.method === TableActionMethodEnum.ZAPIER,
  );
  t.falsy(deletedZapierAction);

  // Check if the rule is updated

  const findTableRuleResult = await request(app.getHttpServer())
    .get(`/action/rules/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableRulesRO: FoundTableActionRulesRoDTO = JSON.parse(findTableRuleResult.text);

  t.is(findTableRuleResult.status, 200);
  t.truthy(findTableRulesRO.action_rules);
  t.is(findTableRulesRO.action_rules.length, 1);
  const findTableRuleRO = findTableRulesRO.action_rules[0];

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
  const foundMultipleAction = findTableRuleRO.table_actions.find((action) => action.id === urlActionId);
  t.truthy(foundMultipleAction);
  t.is(foundMultipleAction.url, updateTableRuleDTO.table_actions[0].url);
  t.is(foundMultipleAction.method, updateTableRuleDTO.table_actions[0].method);
  t.is(foundMultipleAction.slack_url, null);
  t.is(foundMultipleAction.emails.length, updateTableRuleDTO.table_actions[0].emails.length);
  const foundSlackActions = findTableRuleRO.table_actions.filter(
    (action) => action.method === TableActionMethodEnum.SLACK,
  );
  t.is(foundSlackActions.length, 2);
  t.truthy(foundSlackActions[0].slack_url);
  t.deepEqual(foundSlackActions[0].emails, []);
  t.truthy(foundSlackActions[1].slack_url);
  t.deepEqual(foundSlackActions[1].emails, []);
  const foundZapierAction = findTableRuleRO.table_actions.find(
    (action) => action.method === TableActionMethodEnum.ZAPIER,
  );
  t.falsy(foundZapierAction);
});

currentTest = 'POST /rule/actions/activate/:ruleId/:connectionId';

test.serial(`${currentTest} should return created table rule with action and events`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const secondPrimaryKeyPart = 'second_id';

  await resetPostgresTestDbTableCompositePrimaryKeys(testTableName, secondPrimaryKeyPart);

  const fakeUrl = 'http://www.example.com';
  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.CUSTOM,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
    ],
    table_actions: [
      {
        url: fakeUrl,
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [],
      },
      {
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: fakeUrl,
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

  const nockBodiesArray = [];
  const scope = nock(fakeUrl)
    .post('/')
    .times(2)
    .reply(201, (uri, requestBody) => {
      nockBodiesArray.push(requestBody);
      return {
        status: 201,
        message: 'Table action was triggered',
      };
    });

  const activateTableRuleResult = await request(app.getHttpServer())
    .post(`/event/actions/activate/${createTableRuleRO.events[0].id}/${createConnectionRO.id}`)
    .set('Cookie', token)
    .send([{ id: 2, second_id: 'test_key' }])
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const activateTableRuleRO: ActivatedTableActionsDTO = JSON.parse(activateTableRuleResult.text);
  t.is(activateTableRuleResult.status, 201);
  t.is(activateTableRuleRO.hasOwnProperty('activationResults'), true);
  t.is(activateTableRuleRO.activationResults.length, 2);

  t.is(nockBodiesArray.length, 2);
  const urlActionRequestBody = nockBodiesArray.find((body) => body.hasOwnProperty(`$$_raUserId`));
  t.truthy(urlActionRequestBody);
  t.truthy(urlActionRequestBody['$$_raUserId']);
  t.truthy(urlActionRequestBody['$$_date']);
  t.truthy(urlActionRequestBody['$$_tableName']);
  t.truthy(urlActionRequestBody['$$_actionId']);
  t.is(urlActionRequestBody['$$_tableName'], testTableName);
  t.is(urlActionRequestBody['primaryKeys'][0].id, 2);

  const slackActionRequestBody = nockBodiesArray.find((body) => body.hasOwnProperty(`text`));

  t.truthy(slackActionRequestBody);
  t.truthy(slackActionRequestBody['text']);
  t.truthy(slackActionRequestBody['text'].includes(testTableName));
  t.truthy(slackActionRequestBody['text'].includes(`[{"id":2,"second_id":"test_key"}]`));
  scope.done();
  await resetPostgresTestDB();
});

//test impersonate action

test.serial(`${currentTest} should create impersonate action`, async (t) => {
  const firstUser = await registerUserAndReturnUserInfo(app);
  const secondUser = await registerUserAndReturnUserInfo(app);

  const connectionToSaasDatabase: CreateConnectionDto = {
    host: 'rocketadmin-private-microservice-test-database',
    username: 'postgres',
    password: 'abc987',
    database: 'postgres',
    port: 5432,
    type: ConnectionTypesEnum.postgres,
    masterEncryption: false,
    ssh: false,
  } as any;

  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(connectionToSaasDatabase)
    .set('Cookie', firstUser.token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const actionTableName = `user_info`;

  const url = `http://rocketadmin-private-microservice:3001/actions/impersonate/link`;
  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test impersonate rule',
    table_name: actionTableName,
    events: [
      {
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.CUSTOM,
        title: 'Impersonate',
        icon: 'test-icon',
        require_confirmation: false,
      },
    ],
    table_actions: [
      {
        url: url,
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [],
      },
    ],
  };

  const createTableRuleResult = await request(app.getHttpServer())
    .post(`/action/rule/${createConnectionRO.id}`)
    .send(tableRuleDTO)
    .set('Cookie', firstUser.token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableRuleRO: FoundActionRulesWithActionsAndEventsDTO = JSON.parse(createTableRuleResult.text);
  t.is(createTableRuleResult.status, 201);

  //get second user id from jwt token

  const secondUserId = testUtils.verifyJwtToken(secondUser.token).sub;

  //activate impersonate action and receive redirection link

  const activateTableActionResult = await request(app.getHttpServer())
    .post(`/event/actions/activate/${createTableRuleRO.events[0].id}/${createConnectionRO.id}`)
    .send([{ id: secondUserId }])
    .set('Cookie', firstUser.token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const actionActivationRO = JSON.parse(activateTableActionResult.text);
  t.is(activateTableActionResult.status, 201);
  t.is(actionActivationRO.hasOwnProperty('location'), true);

  const redirectionLink = actionActivationRO.location;
  const getLinkResult = await fetch(redirectionLink, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: firstUser.token,
    },
    redirect: 'manual',
  });

  t.is(getLinkResult.status, 301);
});

currentTest = 'POST/PUT/DELETE /table/row/:slug';

test.serial(`${currentTest} should create trigger and activate http table action on add row`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const fakeUrl = 'http://www.example.com';
  const tableRuleDTO: CreateTableActionRuleBodyDTO = {
    title: 'Test rule',
    table_name: testTableName,
    events: [
      {
        type: TableActionTypeEnum.single,
        event: TableActionEventEnum.ADD_ROW,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        type: TableActionTypeEnum.multiple,
        event: TableActionEventEnum.DELETE_ROW,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
      {
        type: TableActionTypeEnum.multiple,
        event: TableActionEventEnum.UPDATE_ROW,
        title: 'Test event',
        icon: 'test-icon',
        require_confirmation: false,
      },
    ],
    table_actions: [
      {
        url: fakeUrl,
        method: TableActionMethodEnum.URL,
        slack_url: undefined,
        emails: [],
      },
      {
        url: undefined,
        method: TableActionMethodEnum.SLACK,
        slack_url: fakeUrl,
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
  console.log('🚀 ~ test.serial ~ createTableRuleRO:', createTableRuleRO);
  t.is(createTableRuleResult.status, 201);

  const nockBodiesArray = [];
  const scope = nock(fakeUrl)
    .post('/')
    .times(6)
    .reply(201, (uri, requestBody) => {
      nockBodiesArray.push(requestBody);
      return {
        status: 201,
        message: 'Table action was triggered',
      };
    });

  const fakeName = faker.person.firstName();
  const fakeMail = faker.internet.email();

  const row = {
    [testTableColumnName]: fakeName,
    [testTAbleSecondColumnName]: fakeMail,
  };

  const addRowInTableResponse = await request(app.getHttpServer())
    .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(JSON.stringify(row))
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(addRowInTableResponse.status, 201);

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

  const idForDeletion = 1;
  const deleteRowInTableResponse = await request(app.getHttpServer())
    .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForDeletion}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  t.is(deleteRowInTableResponse.status, 200);

  t.is(nockBodiesArray.length, 6);
  const userDeletedRowSlackMessageRequestBody = nockBodiesArray.find(
    (body) => body.hasOwnProperty(`text`) && body['text'].includes('deleted'),
  );
  t.truthy(userDeletedRowSlackMessageRequestBody);
  t.truthy(userDeletedRowSlackMessageRequestBody['text']);
  t.truthy(userDeletedRowSlackMessageRequestBody['text'].includes(testTableName));
  t.truthy(userDeletedRowSlackMessageRequestBody['text'].includes(`[{"id":"${idForDeletion}"}]`));

  const userAddedRowSlackMessageRequestBody = nockBodiesArray.find(
    (body) => body.hasOwnProperty(`text`) && body['text'].includes('added'),
  );

  t.truthy(userAddedRowSlackMessageRequestBody);
  t.truthy(userAddedRowSlackMessageRequestBody['text']);
  t.truthy(userAddedRowSlackMessageRequestBody['text'].includes(testTableName));
  t.truthy(userAddedRowSlackMessageRequestBody['text'].includes(`[{"id":${testEntitiesSeedsCount + 1}}]`));

  const userUpdatedRowSlackMessageRequestBody = nockBodiesArray.find(
    (body) => body.hasOwnProperty(`text`) && body['text'].includes('updated'),
  );
  t.truthy(userUpdatedRowSlackMessageRequestBody);
  t.truthy(userUpdatedRowSlackMessageRequestBody['text']);
  t.truthy(userUpdatedRowSlackMessageRequestBody['text'].includes(testTableName));
  t.truthy(userUpdatedRowSlackMessageRequestBody['text'].includes(`[{"id":"1"}]`));
  scope.done();
});
