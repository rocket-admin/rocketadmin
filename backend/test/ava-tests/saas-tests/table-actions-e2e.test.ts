/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
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
import { CreateConnectionDto } from '../../../src/entities/connection/application/dto/create-connection.dto.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';
import { CreateTableActionDTO } from '../../../src/entities/table-actions/table-actions-module/dto/create-table-action.dto.js';
import { TableActionTypeEnum } from '../../../src/enums/table-action-type.enum.js';
import { TableActionMethodEnum } from '../../../src/enums/table-action-method-enum.js';
import { CreateTableActionRuleBodyDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/create-action-rules-with-actions-and-events-body.dto.js';
import { FoundActionRulesWithActionsAndEventsDTO } from '../../../src/entities/table-actions/table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';
import { TableActionEventEnum } from '../../../src/enums/table-action-event-enum.js';
import { FoundTableActionsDS } from '../../../src/entities/table-actions/table-actions-module/application/data-sctructures/found-table-actions.ds.js';

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

currentTest = 'GET /table/actions/:slug';

test(`${currentTest} should return found table actions`, async (t) => {
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

  const findTableActionResult = await request(app.getHttpServer())
    .get(`/table/actions/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableActionRO: FoundTableActionsDS = JSON.parse(findTableActionResult.text);
  console.log('🚀 ~ test.only ~ findTableActionRO:', findTableActionRO);
  t.is(findTableActionResult.status, 200);
  t.is(findTableActionRO.hasOwnProperty('table_name'), true);
  t.is(findTableActionRO.table_name, testTableName);
  t.is(findTableActionRO.hasOwnProperty('table_actions'), true);
  t.is(findTableActionRO.table_actions.length, 2);
  const foundSingleAction = findTableActionRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.single,
  );
  const foundMultipleAction = findTableActionRO.table_actions.find(
    (action) => action.type === TableActionTypeEnum.multiple,
  );
  t.is(foundSingleAction.hasOwnProperty('id'), true);
  t.is(foundSingleAction.hasOwnProperty('type'), true);
  t.is(foundSingleAction.hasOwnProperty('url'), true);
  t.is(foundSingleAction.hasOwnProperty('method'), true);
  t.is(foundSingleAction.hasOwnProperty('slack_url'), true);
  t.is(foundSingleAction.hasOwnProperty('emails'), true);
  t.is(foundMultipleAction.hasOwnProperty('id'), true);
  t.is(foundMultipleAction.hasOwnProperty('type'), true);
  t.is(foundMultipleAction.hasOwnProperty('url'), true);
  t.is(foundMultipleAction.hasOwnProperty('method'), true);
  t.is(foundMultipleAction.hasOwnProperty('slack_url'), true);
  t.is(foundMultipleAction.hasOwnProperty('emails'), true);
});

test(`${currentTest} should throw exception when connection id incorrect`, async (t) => {
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

  t.is(createTableActionResult.status, 201);

  createConnectionRO.id = faker.string.uuid();
  const findTableActiponResult = await request(app.getHttpServer())
    .get(`/table/actions/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const findTableActionRO = JSON.parse(findTableActiponResult.text);
  t.is(findTableActiponResult.status, 403);
  t.is(findTableActionRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

currentTest = 'GET /table/action/:slug';
test(`${currentTest} should return found table action`, async (t) => {
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

  const findTableActiponResult = await request(app.getHttpServer())
    .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableActionRO = JSON.parse(findTableActiponResult.text);
  t.is(findTableActiponResult.status, 200);
  t.is(findTableActionRO.hasOwnProperty('id'), true);
  // t.is(findTableActionRO.title, newTableAction.title);
  t.is(findTableActionRO.type, newTableAction.type);
  t.is(findTableActionRO.url, newTableAction.url);
});

test(`${currentTest} should throw exception when connection id incorrect`, async (t) => {
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

  const createTableActionRO = JSON.parse(createConnectionResult.text);
  t.is(createTableActionResult.status, 201);

  createConnectionRO.id = faker.string.uuid();

  const findTableActionResult = await request(app.getHttpServer())
    .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const findTableActionRO = JSON.parse(findTableActionResult.text);
  t.is(findTableActionResult.status, 403);
  t.is(findTableActionRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

test(`${currentTest} should throw exception when table action id is incorrect`, async (t) => {
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

  const createTableActionRO = JSON.parse(createConnectionResult.text);
  t.is(createTableActionResult.status, 201);

  createTableActionRO.id = faker.string.uuid();

  const findTableActionResult = await request(app.getHttpServer())
    .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const findTableActionRO = JSON.parse(findTableActionResult.text);
  t.is(findTableActionResult.status, 400);
  t.is(findTableActionRO.message, Messages.TABLE_ACTION_NOT_FOUND);
});

//test impersonate action

currentTest = 'POST /table/action/:slug';
test(`${currentTest} should return created impersonate action`, async (t) => {
  const firstUser = await registerUserAndReturnUserInfo(app);
  const secondUser = await registerUserAndReturnUserInfo(app);
  //DATABASE_URL=postgres://postgres:abc987@rocketadmin-private-microservice-test-database:5432/postgres

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
  const impersonateAction = {
    title: faker.lorem.words(2),
    type: 'multiple',
    url: `http://rocketadmin-private-microservice:3001/actions/impersonate/link`,
  };

  const createTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${actionTableName}`)
    .send(impersonateAction)
    .set('Cookie', firstUser.token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 201);
  t.is(typeof createTableActionRO, 'object');
  t.is(createTableActionRO.title, impersonateAction.title);
  t.is(createTableActionRO.type, impersonateAction.type);
  t.is(createTableActionRO.url, impersonateAction.url);
  t.is(createTableActionRO.hasOwnProperty('id'), true);

  //get second user id from jwt token

  const secondUserId = testUtils.verifyJwtToken(secondUser.token).sub;

  //activate impersonate action and receive redirection link

  const actionActivationResult = await request(app.getHttpServer())
    .post(
      `/table/actions/activate/${createConnectionRO.id}?actionId=${createTableActionRO.id}&confirmed=true&tableName=${actionTableName}`,
    )
    .send([{ id: secondUserId }])
    .set('Cookie', firstUser.token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const actionActivationRO = JSON.parse(actionActivationResult.text);
  t.is(actionActivationRO.hasOwnProperty('location'), true);
  t.is(actionActivationResult.status, 201);

  //check if redirection link is correct

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
