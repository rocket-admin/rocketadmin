import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../src/app.module.js';
import { Constants } from '../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import { MockFactory } from '../mock.factory.js';
import { dropTestTables } from '../utils/drop-test-tables.js';
import { getTestKnex } from '../utils/get-test-knex.js';
import { TestUtils } from '../utils/test.utils.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let newConnection;
let newConnectionProperties;
let testTableName: string;
const testTableColumnName = 'name';
const testTAbleSecondColumnName = 'email';
const testSearchedUserName = 'Vasia';
const testEntitiesSeedsCount = 42;
const testTables: Array<string> = [];
let currentTest;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  testUtils = moduleFixture.get<TestUtils>(TestUtils);
  await testUtils.resetDb();
  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  await app.init();
  app.getHttpServer().listen(0);
});

async function resetPostgresTestDB(testTableName) {
  const Knex = getTestKnex(mockFactory.generateConnectionToTestPostgresDBInDocker());
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
        [testTableColumnName]: faker.name.firstName(),
        [testTAbleSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }
}

test.beforeEach(async (t) => {
  testTableName = faker.random.words(1);
  testTables.push(testTableName);
  newConnectionProperties = mockFactory.generateConnectionPropertiesUserExcluded(testTableName);
  await resetPostgresTestDB(testTableName);
});

// test.after('cleanup', async (t) => {
//   await dropTestTables(testTables, mockFactory.generateConnectionToTestPostgresDBInDocker());
// });

type RegisterUserData = {
  email: string;
  password: string;
};

async function registerUserAndReturnUserInfo(): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  const adminUserRegisterInfo: RegisterUserData = {
    email: faker.internet.email(),
    password: 'ahalai-mahalai',
  };

  const registerAdminUserResponse = await request(app.getHttpServer())
    .post('/user/register/')
    .send(adminUserRegisterInfo)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  if (registerAdminUserResponse.status > 300) {
    console.log('registerAdminUserResponse.text -> ', registerAdminUserResponse.text);
  }
  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(registerAdminUserResponse)}`;
  return { token: token, ...adminUserRegisterInfo };
}

function getTestData() {
  const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
  const newConnection2 = mockFactory.generateCreateConnectionDto2();
  const newConnectionToTestDB = mockFactory.generateCreateConnectionDtoToTEstDB();
  const updateConnection = mockFactory.generateUpdateConnectionDto();
  const newGroup1 = mockFactory.generateCreateGroupDto1();
  return {
    newConnection,
    newConnection2,
    newConnectionToTestDB,
    updateConnection,
    newGroup1,
  };
}

currentTest = 'POST /connection/properties/:slug';
test(`${currentTest} should return created connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(newConnectionProperties)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
    t.is(createConnectionPropertiesResponse.status, 201);
    t.is(createConnectionPropertiesRO.hidden_tables[0], newConnectionProperties.hidden_tables[0]);
    t.is(createConnectionPropertiesRO.connectionId, createConnectionRO.id);
    t.is(uuidRegex.test(createConnectionPropertiesRO.id), true);
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should return connection without excluded tables`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(newConnectionProperties)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
    t.is(createConnectionPropertiesResponse.status, 201);
    t.is(createConnectionPropertiesRO.hidden_tables[0], newConnectionProperties.hidden_tables[0]);
    t.is(createConnectionPropertiesRO.connectionId, createConnectionRO.id);
    t.is(uuidRegex.test(createConnectionPropertiesRO.id), true);

    const getConnectionTablesResponse = await request(app.getHttpServer())
      .get(`/connection/tables/${createConnectionRO.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getConnectionTablesRO = JSON.parse(getConnectionTablesResponse.text);
    t.is(getConnectionTablesRO.length > 0, true);
    const hiddenTable = getConnectionTablesRO.find((table) => table.name === newConnectionProperties.hidden_tables[0]);
    t.is(hiddenTable, undefined);
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw an exception when excluded table name is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const copyNewConnectionResponse = JSON.parse(JSON.stringify(newConnectionProperties));
    copyNewConnectionResponse.hidden_tables[0] = `${faker.random.words(1)}_${faker.datatype.number({min: 1, max: 10000})}`;;
    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(copyNewConnectionResponse)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
    t.is(createConnectionPropertiesResponse.status, 400);
  } catch (e) {
    throw e;
  }
});

currentTest = 'GET /connection/properties/:slug';
test(`${currentTest} should return connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(newConnectionProperties)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionPropertiesResponse.status, 201);

    const getConnectionPropertiesResponse = await request(app.getHttpServer())
      .get(`/connection/properties/${createConnectionRO.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getConnectionPropertiesRO = JSON.parse(getConnectionPropertiesResponse.text);
    t.is(getConnectionPropertiesRO.hidden_tables[0], newConnectionProperties.hidden_tables[0]);
    t.is(getConnectionPropertiesRO.connectionId, createConnectionRO.id);
    t.is(uuidRegex.test(getConnectionPropertiesRO.id), true);
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw exception when connection id is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(newConnectionProperties)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionPropertiesResponse.status, 201);

    const getConnectionPropertiesResponse = await request(app.getHttpServer())
      .get(`/connection/properties/${faker.datatype.uuid()}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getConnectionPropertiesResponse.status, 403);
  } catch (e) {
    throw e;
  }
});

currentTest = 'DELETE /connection/properties/:slug';
test(`${currentTest} should return deleted connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(newConnectionProperties)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionPropertiesResponse.status, 201);

    const getConnectionPropertiesResponse = await request(app.getHttpServer())
      .get(`/connection/properties/${createConnectionRO.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionPropertiesResponse.status, 201);

    const getConnectionPropertiesRO = JSON.parse(getConnectionPropertiesResponse.text);
    t.is(getConnectionPropertiesRO.hidden_tables[0], newConnectionProperties.hidden_tables[0]);
    t.is(getConnectionPropertiesRO.connectionId, createConnectionRO.id);
    t.is(uuidRegex.test(getConnectionPropertiesRO.id), true);

    const deleteConnectionPropertiesResponse = await request(app.getHttpServer())
      .delete(`/connection/properties/${createConnectionRO.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(deleteConnectionPropertiesResponse.status, 200);
    const deleteConnectionPropertiesRO = JSON.parse(deleteConnectionPropertiesResponse.text);

    t.is(deleteConnectionPropertiesRO.hidden_tables[0], newConnectionProperties.hidden_tables[0]);

    const getConnectionPropertiesResponseAfterDeletion = await request(app.getHttpServer())
      .get(`/connection/properties/${createConnectionRO.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionPropertiesResponse.status, 201);
    const getConnectionPropertiesAfterDeletionRO = getConnectionPropertiesResponseAfterDeletion.text;
    //todo check
    // t.is(JSON.stringify(getConnectionPropertiesAfterDeletionRO)).toBe(null);
  } catch (e) {
    throw e;
  }
});

test(`${currentTest} should throw exception when connection id is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(newConnectionProperties)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createConnectionPropertiesResponse.status, 201);

    const getConnectionPropertiesResponse = await request(app.getHttpServer())
      .get(`/connection/properties/${faker.datatype.uuid()}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getConnectionPropertiesResponse.status, 403);
  } catch (e) {
    throw e;
  }
});

currentTest = 'PUT /connection/properties/:slug';
test(`${currentTest} should return updated connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo();

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${createConnectionRO.id}`)
      .send(newConnectionProperties)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
    t.is(createConnectionPropertiesResponse.status, 201);
    t.is(createConnectionPropertiesRO.hidden_tables[0], newConnectionProperties.hidden_tables[0]);
    t.is(createConnectionPropertiesRO.connectionId, createConnectionRO.id);
    t.is(uuidRegex.test(createConnectionPropertiesRO.id), true);
  } catch (e) {
    throw e;
  }
});

// test(`${currentTest} `, async (t) => {
//   try {
//   } catch (e) {
//     throw e;
//   }
// });
