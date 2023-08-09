import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import knex from 'knex';
import request from 'supertest';
import { ApplicationModule } from '../../src/app.module.js';
import { TableActionEntity } from '../../src/entities/table-actions/table-action.entity.js';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../src/exceptions/text/messages.js';
import { Cacher } from '../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import { MockFactory } from '../mock.factory.js';
import { registerUserAndReturnUserInfo } from '../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../utils/test.utils.js';

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
  await testUtils.resetDb();
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
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

test(`${currentTest} should throw exception when type is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const createConnectionResult = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResult.text);
  t.is(createConnectionResult.status, 201);

  const tableActionCopy = {
    ...newTableAction,
  };
  tableActionCopy.type = faker.lorem.words(1) as any;

  const createTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(tableActionCopy)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 400);
  t.is(createTableActionRO.message, Messages.TABLE_ACTION_TYPE_INCORRECT);
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

  createConnectionRO.id = faker.datatype.uuid();
  const createTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 403);
  t.is(createTableActionRO.message, Messages.DONT_HAVE_PERMISSIONS);
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

  const createTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
    .send(newTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(createTableActionResult.status, 201);

  const findTableActiponResult = await request(app.getHttpServer())
    .get(`/table/actions/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const findTableActionRO = JSON.parse(findTableActiponResult.text);
  t.is(Array.isArray(findTableActionRO.table_actions), true);
  t.is(findTableActionRO.table_actions[0].hasOwnProperty('id'), true);
  t.is(findTableActionRO.table_actions[0].title, newTableAction.title);
  t.is(findTableActionRO.table_actions[0].type, newTableAction.type);
  t.is(findTableActionRO.table_actions[0].url, newTableAction.url);
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

  createConnectionRO.id = faker.datatype.uuid();
  const findTableActiponResult = await request(app.getHttpServer())
    .get(`/table/actions/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const findTableActionRO = JSON.parse(findTableActiponResult.text);
  t.is(findTableActiponResult.status, 403);
  t.is(findTableActionRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

currentTest = 'PUT /table/action/:slug';

test(`${currentTest} should return updated table action`, async (t) => {
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

  const updatedTableAction = {
    ...newTableAction,
  };
  updatedTableAction.title = faker.lorem.words(2);
  updatedTableAction.url = faker.internet.url();
  delete updatedTableAction.id;

  const updateTableActionResult = await request(app.getHttpServer())
    .put(`/table/action/${createConnectionRO.id}?tableName=${testTableName}&actionId=${createTableActionRO.id}`)
    .send(updatedTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const updateTableActionRO = JSON.parse(updateTableActionResult.text);

  t.is(updateTableActionResult.status, 200);

  t.is(updateTableActionRO.id, createTableActionRO.id);
  t.is(updateTableActionRO.title, updatedTableAction.title);
  t.is(updateTableActionRO.url, updatedTableAction.url);
  t.is(updateTableActionRO.type, newTableAction.type);

  //check if table action was updated in db
  const findTableActiponResult = await request(app.getHttpServer())
    .get(`/table/actions/${createConnectionRO.id}?tableName=${testTableName}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const findTableActionRO = JSON.parse(findTableActiponResult.text);

  t.is(findTableActiponResult.status, 200);
  t.is(findTableActionRO.table_actions[0].id, createTableActionRO.id);
  t.is(findTableActionRO.table_actions[0].title, updatedTableAction.title);
  t.is(findTableActionRO.table_actions[0].url, updatedTableAction.url);
  t.is(findTableActionRO.table_actions[0].type, newTableAction.type);
});

test(`${currentTest} should throw exception when type is incorrect`, async (t) => {
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

  const updatedTableAction = {
    ...newTableAction,
  };
  updatedTableAction.title = faker.lorem.words(2);
  updatedTableAction.url = faker.internet.url();
  updatedTableAction.type = faker.datatype.uuid() as any;

  const updateTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}&actionId=${createTableActionRO.id}`)
    .send(updatedTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const updateTableActionRO = JSON.parse(updateTableActionResult.text);
  t.is(updateTableActionResult.status, 400);
  t.is(updateTableActionRO.message, Messages.TABLE_ACTION_TYPE_INCORRECT);
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

  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 201);

  const updatedTableAction = {
    ...newTableAction,
  };
  updatedTableAction.title = faker.lorem.words(2);
  updatedTableAction.url = faker.internet.url();

  createConnectionRO.id = faker.datatype.uuid();
  const updateTableActionResult = await request(app.getHttpServer())
    .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}&actionId=${createTableActionRO.id}`)
    .send(updatedTableAction)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const updateTableActionRO = JSON.parse(updateTableActionResult.text);
  t.is(updateTableActionResult.status, 403);
  t.is(updateTableActionRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

currentTest = `DELETE /table/action/:slug`;
test(`${currentTest} should delete table action and return deleted table action`, async (t) => {
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

  const deleteTableActionResult = await request(app.getHttpServer())
    .delete(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const deleteTableActionRO = JSON.parse(deleteTableActionResult.text);
  t.is(deleteTableActionResult.status, 200);
  t.is(deleteTableActionRO.utl, createTableActionRO.utl);
  t.is(deleteTableActionRO.type, createTableActionRO.type);
  t.is(deleteTableActionRO.title, createTableActionRO.title);

  const getTableActionResult = await request(app.getHttpServer())
    .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const getTableActionRO = JSON.parse(getTableActionResult.text);
  t.is(getTableActionResult.status, 400);
  t.is(getTableActionRO.message, Messages.TABLE_ACTION_NOT_FOUND);
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
  const createTableActionRO = JSON.parse(createTableActionResult.text);
  t.is(createTableActionResult.status, 201);

  createConnectionRO.id = faker.datatype.uuid();
  const deleteTableActionResult = await request(app.getHttpServer())
    .delete(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const deleteTableActionRO = JSON.parse(deleteTableActionResult.text);
  t.is(deleteTableActionResult.status, 403);
  t.is(deleteTableActionRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

test(`${currentTest} should throw exception when table action id incorrect`, async (t) => {
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

  createTableActionRO.id = faker.datatype.uuid();
  const deleteTableActionResult = await request(app.getHttpServer())
    .delete(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const deleteTableActionRO = JSON.parse(deleteTableActionResult.text);
  t.is(deleteTableActionResult.status, 400);
  t.is(deleteTableActionRO.message, Messages.TABLE_ACTION_NOT_FOUND);
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
  t.is(findTableActionRO.title, newTableAction.title);
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

  createConnectionRO.id = faker.datatype.uuid();

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

  createTableActionRO.id = faker.datatype.uuid();

  const findTableActionResult = await request(app.getHttpServer())
    .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const findTableActionRO = JSON.parse(findTableActionResult.text);
  t.is(findTableActionResult.status, 400);
  t.is(findTableActionRO.message, Messages.TABLE_ACTION_NOT_FOUND);
});
