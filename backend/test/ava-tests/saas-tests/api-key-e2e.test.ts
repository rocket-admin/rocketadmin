/* eslint-disable security/detect-object-injection */
import test from 'ava';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { faker } from '@faker-js/faker';
import { createTestTable } from '../../utils/create-test-table.js';
import { getTestData } from '../../utils/get-test-data.js';
import { MockFactory } from '../../mock.factory.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

let app: INestApplication;
let currentTest: string;

const mockFactory = new MockFactory();

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  // testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(WinstonLogger)));
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
    console.error('After custom field error: ' + e);
  }
});

currentTest = `POST /apikey`;

test.serial(`${currentTest} should return created api key for this user`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName } = await createTestTable(connectionToTestDB);

    const apiKeyTitle = 'Test API Key';

    const createApiKeyResult = await request(app.getHttpServer())
      .post('/apikey')
      .send({ title: apiKeyTitle })
      .set('Content-Type', 'application/json')
      .set('Cookie', firstUserToken)
      .set('Accept', 'application/json');

    t.is(createApiKeyResult.status, 201);
    const createApiKeyRO = JSON.parse(createApiKeyResult.text);
    t.is(createApiKeyRO.title, apiKeyTitle);
    t.truthy(createApiKeyRO.hash);
    t.truthy(createApiKeyRO.hash.includes('sk_'));
    t.truthy(createApiKeyRO.id);

    // check that user has access to table controller

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const getTablesResponse = await request(app.getHttpServer())
      .get(`/connection/tables/${createConnectionRO.id}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-api-key', createApiKeyRO.hash);

    const getTablesRO = JSON.parse(getTablesResponse.text);
    t.is(typeof getTablesRO, 'object');
    t.is(getTablesRO.length > 0, true);

    const testTableIndex = getTablesRO.findIndex((t) => t.table === testTableName);

    t.is(getTablesRO[testTableIndex].hasOwnProperty('table'), true);
    t.is(getTablesRO[testTableIndex].hasOwnProperty('permissions'), true);
    t.is(typeof getTablesRO[testTableIndex].permissions, 'object');
    t.is(Object.keys(getTablesRO[testTableIndex].permissions).length, 5);
    t.is(getTablesRO[testTableIndex].table, testTableName);
    t.is(getTablesRO[testTableIndex].permissions.visibility, true);
    t.is(getTablesRO[testTableIndex].permissions.readonly, false);
    t.is(getTablesRO[testTableIndex].permissions.add, true);
    t.is(getTablesRO[testTableIndex].permissions.delete, true);
    t.is(getTablesRO[testTableIndex].permissions.edit, true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test.serial(`${currentTest} user should have access to table controller by api key`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    const apiKeyTitle = 'Test API Key';

    const createApiKeyResult = await request(app.getHttpServer())
      .post('/apikey')
      .send({ title: apiKeyTitle })
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');

    t.is(createApiKeyResult.status, 201);
    const createApiKeyRO = JSON.parse(createApiKeyResult.text);
    t.is(createApiKeyRO.title, apiKeyTitle);
    t.truthy(createApiKeyRO.hash);
    t.truthy(createApiKeyRO.hash.includes('sk_'));
    t.truthy(createApiKeyRO.id);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test.serial(`${currentTest} should throw an exception when title not passed`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    const createApiKeyResult = await request(app.getHttpServer())
      .post('/apikey')
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');

    t.is(createApiKeyResult.status, 400);
    const createApiKeyRO = JSON.parse(createApiKeyResult.text);
    t.truthy(createApiKeyRO.message.includes(`Property "title" validation failed`));
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = `GET /apikeys`;

test.serial(`${currentTest} should return all users api keys`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    const apiKeysData = [{ title: 'Test API Key 1' }, { title: 'Test API Key 2' }, { title: 'Test API Key 3' }];

    for (const apiKeyData of apiKeysData) {
      const createApiKeyResult = await request(app.getHttpServer())
        .post('/apikey')
        .send(apiKeyData)
        .set('Content-Type', 'application/json')
        .set('Cookie', token)
        .set('Accept', 'application/json');
      t.is(createApiKeyResult.status, 201);
    }

    const getApiKeysResult = await request(app.getHttpServer())
      .get('/apikeys')
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getApiKeysResult.status, 200);
    const getApiKeysRO = JSON.parse(getApiKeysResult.text);
    t.is(getApiKeysRO.length, apiKeysData.length);

    for (let i = 0; i < apiKeysData.length; i++) {
      t.is(getApiKeysRO[i].title, apiKeysData[i].title);
      t.falsy(getApiKeysRO[i].hash);
      t.truthy(getApiKeysRO[i].id);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = `GET /apikey/:apiKeyId`;

test.serial(`${currentTest} should return found user api key`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    const apiKeysData = [{ title: 'Test API Key 1' }, { title: 'Test API Key 2' }, { title: 'Test API Key 3' }];

    const createdApiKeys = [];
    for (const apiKeyData of apiKeysData) {
      const createApiKeyResult = await request(app.getHttpServer())
        .post('/apikey')
        .send(apiKeyData)
        .set('Content-Type', 'application/json')
        .set('Cookie', token)
        .set('Accept', 'application/json');
      t.is(createApiKeyResult.status, 201);
      createdApiKeys.push(JSON.parse(createApiKeyResult.text));
    }

    const apiKeyToSearch = createdApiKeys[Math.floor(Math.random() * createdApiKeys.length)];

    const getApiKeyResult = await request(app.getHttpServer())
      .get(`/apikey/${apiKeyToSearch.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getApiKeyResult.status, 200);
    const getApiKeyRO = JSON.parse(getApiKeyResult.text);
    t.is(getApiKeyRO.title, apiKeyToSearch.title);
    t.falsy(getApiKeyRO.hash);
    t.is(getApiKeyRO.id, apiKeyToSearch.id);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test.serial(`${currentTest} should throw an exception when key with id not exist in database`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    const apiKeysData = [{ title: 'Test API Key 1' }, { title: 'Test API Key 2' }, { title: 'Test API Key 3' }];

    const createdApiKeys = [];
    for (const apiKeyData of apiKeysData) {
      const createApiKeyResult = await request(app.getHttpServer())
        .post('/apikey')
        .send(apiKeyData)
        .set('Content-Type', 'application/json')
        .set('Cookie', token)
        .set('Accept', 'application/json');
      t.is(createApiKeyResult.status, 201);
      createdApiKeys.push(JSON.parse(createApiKeyResult.text));
    }

    const apiKeyToSearch = faker.string.uuid();

    const getApiKeyResult = await request(app.getHttpServer())
      .get(`/apikey/${apiKeyToSearch}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getApiKeyResult.status, 404);
    const getApiKeyRO = JSON.parse(getApiKeyResult.text);
    t.is(getApiKeyRO.message, Messages.API_KEY_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test.serial(`${currentTest} should delete api key and return deleted key`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    const apiKeysData = [{ title: 'Test API Key 1' }, { title: 'Test API Key 2' }, { title: 'Test API Key 3' }];

    const createdApiKeys = [];
    for (const apiKeyData of apiKeysData) {
      const createApiKeyResult = await request(app.getHttpServer())
        .post('/apikey')
        .send(apiKeyData)
        .set('Content-Type', 'application/json')
        .set('Cookie', token)
        .set('Accept', 'application/json');
      t.is(createApiKeyResult.status, 201);
      createdApiKeys.push(JSON.parse(createApiKeyResult.text));
    }

    const apiKeyToDeletion = createdApiKeys[Math.floor(Math.random() * createdApiKeys.length)];

    const deleteApiKeyResult = await request(app.getHttpServer())
      .delete(`/apikey/${apiKeyToDeletion.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(deleteApiKeyResult.status, 200);
    const deleteApiKeyRO = JSON.parse(deleteApiKeyResult.text);
    t.is(deleteApiKeyRO.title, apiKeyToDeletion.title);
    t.falsy(deleteApiKeyRO.hash);
    t.is(deleteApiKeyRO.id, apiKeyToDeletion.id);

    // check that key is deleted

    const getApiKeyResult = await request(app.getHttpServer())
      .get(`/apikey/${apiKeyToDeletion.id}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getApiKeyResult.status, 404);
    const getApiKeyRO = JSON.parse(getApiKeyResult.text);
    t.is(getApiKeyRO.message, Messages.API_KEY_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = `GET /check/apikey`;

test.serial(`${currentTest} should return created api key for this user`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const apiKeyTitle = 'Test API Key';

    const createApiKeyResult = await request(app.getHttpServer())
      .post('/apikey')
      .send({ title: apiKeyTitle })
      .set('Content-Type', 'application/json')
      .set('Cookie', firstUserToken)
      .set('Accept', 'application/json');

    t.is(createApiKeyResult.status, 201);
    const createApiKeyRO = JSON.parse(createApiKeyResult.text);
    t.is(createApiKeyRO.title, apiKeyTitle);
    t.truthy(createApiKeyRO.hash);
    t.truthy(createApiKeyRO.hash.includes('sk_'));
    t.truthy(createApiKeyRO.id);

    const checkApiKeyResponse = await request(app.getHttpServer())
      .get(`/check/apikey`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('x-api-key', createApiKeyRO.hash);
    t.is(checkApiKeyResponse.status, 200);
  } catch (error) {
    console.error(error);
    throw error;
  }
});
