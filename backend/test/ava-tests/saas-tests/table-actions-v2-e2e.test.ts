/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { CreateTableActionDTO } from '../../../src/entities/table-actions/table-actions-module/dto/create-table-action.dto.js';
import { MockFactory } from '../../mock.factory.js';
import { TestUtils } from '../../utils/test.utils.js';
import test from 'ava';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import knex from 'knex';
import { fa, faker } from '@faker-js/faker';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { CreateTableActionBodyDataDto } from '../../../src/entities/table-actions/application/dto/create-table-action-body-data.dto.js';
import { TableActionEventEnum } from '../../../src/enums/table-action-event-enum.js';
import { TableActionTypeEnum } from '../../../src/enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../src/enums/table-action-method-enum.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let newConnection;
let newTableAction: CreateTableActionDTO;
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

currentTest = 'POST /v2/table/action/:slug';

test(`${currentTest} should return created table action with rules and events`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableActionRequestDTO: CreateTableActionBodyDataDto = {
    action_rules: [
      {
        title: faker.lorem.words(1),
        table_name: testTableName,
        action_events: [
          {
            event: TableActionEventEnum.CUSTOM,
            title: faker.lorem.words(1),
            icon: faker.image.avatar(),
            require_confirmation: false,
          },
        ],
      },
    ],
    table_action: {
      action_type: TableActionTypeEnum.multiple,
      action_method: TableActionMethodEnum.URL,
      emails: [faker.internet.email()],
      url: faker.internet.url(),
      slack_url: faker.internet.url(),
    },
  };

  const createTableActionResult = await request(app.getHttpServer())
    .post(`/v2/table/action/${createConnectionRO.id}`)
    .send(tableActionRequestDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 201);
  t.truthy(createTableActionRO.id);
  t.truthy(createTableActionRO.created_at);
  t.is(createTableActionRO.type, TableActionTypeEnum.multiple);
  t.is(createTableActionRO.method, TableActionMethodEnum.URL);
  t.is(createTableActionRO.url, tableActionRequestDTO.table_action.url);
  t.truthy(createTableActionRO.slack_url);
  t.deepEqual(createTableActionRO.emails, tableActionRequestDTO.table_action.emails);
  t.is(createTableActionRO.action_rules.length, 1);
  t.is(createTableActionRO.action_rules[0].title, tableActionRequestDTO.action_rules[0].title);
  t.is(createTableActionRO.action_rules[0].table_name, tableActionRequestDTO.action_rules[0].table_name);
  t.is(createTableActionRO.action_rules[0].action_events.length, 1);
  t.is(createTableActionRO.action_rules[0].action_events[0].event, TableActionEventEnum.CUSTOM);
});
