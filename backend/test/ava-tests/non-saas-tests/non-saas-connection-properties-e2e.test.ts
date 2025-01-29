/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestKnex } from '../../utils/get-test-knex.js';
import { TestUtils } from '../../utils/test.utils.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { Cacher } from '../../../src/helpers/cache/cacher.js';

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

test.before(async () => {
  setSaasEnvVariable();
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory(validationErrors: ValidationError[] = []) {
        return new ValidationException(validationErrors);
      },
    }),
  );
  await app.init();
  app.getHttpServer().listen(0);
});

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
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
        [testTableColumnName]: faker.person.firstName(),
        [testTAbleSecondColumnName]: faker.internet.email(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }
}

test.beforeEach(async (t) => {
  testTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
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
test.serial(`${currentTest} should return created connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

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
    t.is(createConnectionPropertiesRO.logo_url, newConnectionProperties.logo_url);
    t.is(createConnectionPropertiesRO.primary_color, newConnectionProperties.primary_color);
    t.is(createConnectionPropertiesRO.secondary_color, newConnectionProperties.secondary_color);
    t.is(createConnectionPropertiesRO.hostname, newConnectionProperties.hostname);
    t.is(createConnectionPropertiesRO.human_readable_table_names, newConnectionProperties.human_readable_table_names);
    t.is(createConnectionPropertiesRO.tables_audit, newConnectionProperties.tables_audit);
  } catch (e) {
    throw e;
  }
});

test.serial(`${currentTest} should return connection without excluded tables`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

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

test.serial(`${currentTest} should throw an exception when excluded table name is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const copyNewConnectionResponse = JSON.parse(JSON.stringify(newConnectionProperties));
    copyNewConnectionResponse.hidden_tables[0] = `${faker.lorem.words(1)}_${faker.number.int({
      min: 1,
      max: 10000,
    })}`;
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
test.serial(`${currentTest} should return connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

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
  } catch (e) {
    throw e;
  }
});

test.serial(`${currentTest} should throw exception when connection id is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

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
      .get(`/connection/properties/${faker.string.uuid()}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getConnectionPropertiesResponse.status, 403);
  } catch (e) {
    throw e;
  }
});

currentTest = 'DELETE /connection/properties/:slug';
test.serial(`${currentTest} should return deleted connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

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

test.serial(`${currentTest} should throw exception when connection id is incorrect`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

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
      .get(`/connection/properties/${faker.string.uuid()}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getConnectionPropertiesResponse.status, 403);
  } catch (e) {
    throw e;
  }
});

currentTest = 'PUT /connection/properties/:slug';
test.serial(`${currentTest} should return updated connection properties`, async (t) => {
  try {
    const { newConnection2, newConnectionToTestDB, updateConnection, newGroup1, newConnection } = getTestData();
    const { token } = await registerUserAndReturnUserInfo(app);

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
  } catch (e) {
    throw e;
  }
});

// test.serial(`${currentTest} `, async (t) => {
//   try {
//   } catch (e) {
//     throw e;
//   }
// });
