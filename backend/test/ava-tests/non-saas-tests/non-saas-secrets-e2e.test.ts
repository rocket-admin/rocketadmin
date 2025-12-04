/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

test.before(async () => {
  setSaasEnvVariable();
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

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
    console.error('After tests error ' + e);
  }
});

currentTest = 'POST /secrets';
test.serial(`${currentTest} - should create a new secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const createDto = {
    slug: 'test-api-key',
    value: 'sk-test-1234567890',
    masterEncryption: false,
  };

  const response = await request(app.getHttpServer())
    .post('/secrets')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(createDto);

  t.is(response.status, 201, response.text);
  const responseBody = JSON.parse(response.text);
  t.is(responseBody.slug, 'test-api-key');
  t.is(responseBody.masterEncryption, false);
  t.truthy(responseBody.id);
  t.truthy(responseBody.createdAt);
  t.falsy(responseBody.value);
});

test.serial(`${currentTest} - should return 409 for duplicate slug`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const createDto = {
    slug: 'test-api-key',
    value: 'sk-another-key',
  };

  const response = await request(app.getHttpServer())
    .post('/secrets')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(createDto);

  t.is(response.status, 409, response.text);
  const responseBody = JSON.parse(response.text);
  t.truthy(responseBody.message);
});

test.serial(`${currentTest} - should validate slug format`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const createDto = {
    slug: 'invalid slug with spaces!',
    value: 'sk-test-key',
  };

  const response = await request(app.getHttpServer())
    .post('/secrets')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(createDto);

  t.is(response.status, 400, response.text);
  const responseBody = JSON.parse(response.text);
  t.truthy(responseBody.message);
});

currentTest = 'GET /secrets';
test.serial(`${currentTest} - should return list of company secrets`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.truthy(responseBody.data);
  t.true(Array.isArray(responseBody.data));
  t.truthy(responseBody.pagination);
  t.is(responseBody.pagination.currentPage, 1);
  t.true(responseBody.data.length > 0);

  const firstSecret = responseBody.data[0];
  t.falsy(firstSecret.value);
  t.truthy(firstSecret.slug);
});

test.serial(`${currentTest}?search=test - should filter secrets by slug`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets?search=test')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.truthy(responseBody.data);
  t.true(responseBody.data.every((s: any) => s.slug.includes('test')));
});

currentTest = 'GET /secrets/:slug';
test.serial(`${currentTest} - should return secret with value`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets/test-api-key')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.is(responseBody.slug, 'test-api-key');
  t.truthy(responseBody.value);
  t.truthy(responseBody.lastAccessedAt);
});

test.serial(`${currentTest} - should return 404 for non-existent secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets/non-existent-secret')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 404, response.text);
});

currentTest = 'POST /secrets';
test.serial(`${currentTest} - should create secret with master password`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const createDto = {
    slug: 'protected-secret',
    value: 'sensitive-data',
    masterEncryption: true,
    masterPassword: 'MasterPass123!',
  };

  const response = await request(app.getHttpServer())
    .post('/secrets')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(createDto);

  t.is(response.status, 201, response.text);
  const responseBody = JSON.parse(response.text);
  t.is(responseBody.slug, 'protected-secret');
  t.is(responseBody.masterEncryption, true);
});

currentTest = 'GET /secrets/:slug';
test.serial(`${currentTest} - should require master password for protected secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets/protected-secret')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 403, response.text);
});

test.serial(`${currentTest} - should return protected secret with correct master password`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets/protected-secret')
    .set('Cookie', token)
    .set('masterpwd', 'MasterPass123!')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.is(responseBody.slug, 'protected-secret');
  t.truthy(responseBody.value);
});

currentTest = 'PUT /secrets/:slug';
test.serial(`${currentTest} - should update secret value`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const updateDto = {
    value: 'updated-secret-value',
  };

  const response = await request(app.getHttpServer())
    .put('/secrets/test-api-key')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(updateDto);

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.is(responseBody.slug, 'test-api-key');
  t.truthy(responseBody.updatedAt);
});

test.serial(`${currentTest} - should update expiration date`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const updateDto = {
    value: 'updated-secret-value',
    expiresAt: futureDate.toISOString(),
  };

  const response = await request(app.getHttpServer())
    .put('/secrets/test-api-key')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(updateDto);

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.truthy(responseBody.expiresAt);
});

test.serial(`${currentTest} - should return 404 for non-existent secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const updateDto = {
    value: 'new-value',
  };

  const response = await request(app.getHttpServer())
    .put('/secrets/non-existent')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(updateDto);

  t.is(response.status, 404, response.text);
});

currentTest = 'GET /secrets/:slug/audit-log';
test.serial(`${currentTest} - should return audit log entries`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets/test-api-key/audit-log')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.truthy(responseBody.data);
  t.true(Array.isArray(responseBody.data));
  t.truthy(responseBody.pagination);

  t.true(responseBody.data.length >= 3);

  const logEntry = responseBody.data[0];
  t.truthy(logEntry.id);
  t.truthy(logEntry.action);
  t.truthy(logEntry.user);
  t.truthy(logEntry.accessedAt);
  t.is(logEntry.success, true);
});

test.serial(`${currentTest}?page=1&limit=2 - should paginate audit log`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const response = await request(app.getHttpServer())
    .get('/secrets/test-api-key/audit-log?page=1&limit=2')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.is(responseBody.pagination.perPage, 2);
  t.true(responseBody.data.length <= 2);
});

currentTest = 'POST /secrets';
test.serial(`${currentTest} - should create expired secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);

  const createDto = {
    slug: 'expired-secret',
    value: 'expired-value',
    expiresAt: pastDate.toISOString(),
  };

  const response = await request(app.getHttpServer())
    .post('/secrets')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(createDto);

  t.is(response.status, 201, response.text);
});

currentTest = 'GET /secrets/:slug';
test.serial(`${currentTest} - should return 410 for expired secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets/expired-secret')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 410, response.text);
});

currentTest = 'DELETE /secrets/:slug';
test.serial(`${currentTest} - should delete secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .delete('/secrets/test-api-key')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 200, response.text);
  const responseBody = JSON.parse(response.text);
  t.is(responseBody.message, 'Secret deleted successfully');
  t.truthy(responseBody.deletedAt);
});

currentTest = 'GET /secrets/:slug';
test.serial(`${currentTest} - should return 404 after deletion`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .get('/secrets/test-api-key')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 404, response.text);
});

currentTest = 'DELETE /secrets/:slug';
test.serial(`${currentTest} - should return 404 for non-existent secret`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const response = await request(app.getHttpServer())
    .delete('/secrets/non-existent')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 404, response.text);
});

currentTest = 'GET /secrets';
test.serial(`${currentTest} - unauthorized without token`, async (t) => {
  const response = await request(app.getHttpServer())
    .get('/secrets')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(response.status, 401, response.text);
});

currentTest = 'POST /secrets';
test.serial(`${currentTest} - unauthorized without token`, async (t) => {
  const createDto = {
    slug: 'test-secret',
    value: 'value',
  };

  const response = await request(app.getHttpServer())
    .post('/secrets')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(createDto);

  t.is(response.status, 401, response.text);
});
