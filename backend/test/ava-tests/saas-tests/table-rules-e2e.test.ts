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
import { CreateTableActionRuleBodyDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/create-table-triggers-body.dto.js';
import { TableActionEventEnum } from '../../../src/enums/table-action-event-enum.js';
import { TableActionTypeEnum } from '../../../src/enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../src/enums/table-action-method-enum.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/found-table-triggers-with-actions.dto.js';

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

let currentTest = `POST /table/rule/:connectionId`;

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
    .post(`/table/rule/${createConnectionRO.id}`)
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
