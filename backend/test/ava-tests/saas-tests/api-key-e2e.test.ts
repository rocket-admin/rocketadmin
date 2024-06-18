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

let app: INestApplication;
let currentTest: string;
// let testUtils: TestUtils;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  // testUtils = moduleFixture.get<TestUtils>(TestUtils);

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
});

currentTest = `POST /apikey`;

test(`${currentTest} should return created api key for this user`, async (t) => {
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
  t.pass();
});

test(`${currentTest} should throw an exception when title not passed`, async (t) => {
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
  t.pass();
});

currentTest = `GET /apikeys`;

test(`${currentTest} should return all users api keys`, async (t) => {
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
  t.pass();
});

currentTest = `GET /apikey/:apiKeyId`;

test(`${currentTest} should return found user api key`, async (t) => {
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
  t.pass();
});

test(`${currentTest} should throw an exception when key with id not exist in database`, async (t) => {
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
  t.pass();
});

test(`${currentTest} should delete api key and return deleted key`, async (t) => {
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
      .get(`/apikey/${apiKeyToDeletion.id}`)
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
  t.pass();
});
