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

let app: INestApplication;
let currentTest: string;
let testUtils: TestUtils;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
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
