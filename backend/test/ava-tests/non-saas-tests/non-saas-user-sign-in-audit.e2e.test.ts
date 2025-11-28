/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { MockFactory } from '../../mock.factory.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { SignInStatusEnum } from '../../../src/entities/user-sign-in-audit/enums/sign-in-status.enum.js';
import { SignInMethodEnum } from '../../../src/entities/user-sign-in-audit/enums/sign-in-method.enum.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';

let app: INestApplication;
let currentTest: string;
let testUtils: TestUtils;

const mockFactory = new MockFactory();

async function getCompanyIdByToken(app: INestApplication, token: string): Promise<string> {
  const getCompanyResult = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const companyInfo = JSON.parse(getCompanyResult.text);
  return companyInfo.id;
}

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

currentTest = 'GET /sign-in-audit/logs';

test.serial(`${currentTest} should return sign-in audit logs after successful login`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email, password } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Login again to create a sign-in audit record
    const loginUserResult = await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(loginUserResult.status, 201);

    // Get sign-in audit logs
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 200);
    const auditLogsRO = JSON.parse(getAuditLogsResult.text);

    t.is(auditLogsRO.hasOwnProperty('logs'), true);
    t.is(auditLogsRO.hasOwnProperty('pagination'), true);
    t.true(auditLogsRO.logs.length >= 1);

    // Check that the log entry has expected structure
    const logEntry = auditLogsRO.logs.find((log: any) => log.email === email.toLowerCase());
    t.truthy(logEntry);
    t.is(logEntry.status, SignInStatusEnum.SUCCESS);
    t.is(logEntry.signInMethod, SignInMethodEnum.EMAIL);
    t.is(logEntry.hasOwnProperty('createdAt'), true);
    t.is(logEntry.hasOwnProperty('ipAddress'), true);
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should return sign-in audit logs with failed login attempt`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email, password } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Attempt login with wrong password to create a failed sign-in audit record
    const wrongPassword = 'wrong_password_12345';
    const failedLoginResult = await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password: wrongPassword })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(failedLoginResult.status, 400);

    // Get sign-in audit logs
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 200);
    const auditLogsRO = JSON.parse(getAuditLogsResult.text);

    t.is(auditLogsRO.hasOwnProperty('logs'), true);
    t.true(auditLogsRO.logs.length >= 1);

    // Find the failed login entry
    const failedLogEntry = auditLogsRO.logs.find(
      (log: any) => log.email === email.toLowerCase() && log.status === SignInStatusEnum.FAILED,
    );
    t.truthy(failedLogEntry);
    t.is(failedLogEntry.signInMethod, SignInMethodEnum.EMAIL);
    t.truthy(failedLogEntry.failureReason);
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should filter sign-in audit logs by status`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email, password } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Create a failed login attempt
    const wrongPassword = 'wrong_password_12345';
    await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password: wrongPassword })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // Create a successful login
    await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // Get only failed sign-in audit logs
    const getFailedLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&status=${SignInStatusEnum.FAILED}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getFailedLogsResult.status, 200);
    const failedLogsRO = JSON.parse(getFailedLogsResult.text);

    t.is(failedLogsRO.hasOwnProperty('logs'), true);
    // All returned logs should have failed status
    failedLogsRO.logs.forEach((log: any) => {
      t.is(log.status, SignInStatusEnum.FAILED);
    });

    // Get only successful sign-in audit logs
    const getSuccessLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&status=${SignInStatusEnum.SUCCESS}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getSuccessLogsResult.status, 200);
    const successLogsRO = JSON.parse(getSuccessLogsResult.text);

    t.is(successLogsRO.hasOwnProperty('logs'), true);
    // All returned logs should have success status
    successLogsRO.logs.forEach((log: any) => {
      t.is(log.status, SignInStatusEnum.SUCCESS);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should filter sign-in audit logs by email`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email, password } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Create a successful login
    await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // Get sign-in audit logs filtered by email
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&email=${email.toLowerCase()}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 200);
    const auditLogsRO = JSON.parse(getAuditLogsResult.text);

    t.is(auditLogsRO.hasOwnProperty('logs'), true);
    // All returned logs should have the searched email
    auditLogsRO.logs.forEach((log: any) => {
      t.is(log.email, email.toLowerCase());
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should filter sign-in audit logs by sign-in method`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email, password } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Create a successful login
    await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // Get sign-in audit logs filtered by email sign-in method
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&signInMethod=${SignInMethodEnum.EMAIL}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 200);
    const auditLogsRO = JSON.parse(getAuditLogsResult.text);

    t.is(auditLogsRO.hasOwnProperty('logs'), true);
    // All returned logs should have email sign-in method
    auditLogsRO.logs.forEach((log: any) => {
      t.is(log.signInMethod, SignInMethodEnum.EMAIL);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should support pagination for sign-in audit logs`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email, password } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Create multiple login attempts
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/user/login/')
        .send({ email, password })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
    }

    // Get sign-in audit logs with pagination
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&page=1&perPage=2`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 200);
    const auditLogsRO = JSON.parse(getAuditLogsResult.text);

    t.is(auditLogsRO.hasOwnProperty('logs'), true);
    t.is(auditLogsRO.hasOwnProperty('pagination'), true);
    t.true(auditLogsRO.logs.length <= 2);
    t.is(auditLogsRO.pagination.hasOwnProperty('total'), true);
    t.is(auditLogsRO.pagination.hasOwnProperty('lastPage'), true);
    t.is(auditLogsRO.pagination.hasOwnProperty('perPage'), true);
    t.is(auditLogsRO.pagination.hasOwnProperty('currentPage'), true);
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should return 400 for invalid status filter`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Get sign-in audit logs with invalid status
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&status=invalid_status`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 400);
    const errorRO = JSON.parse(getAuditLogsResult.text);
    t.is(errorRO.message, Messages.INVALID_SIGN_IN_STATUS);
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should return 400 for invalid sign-in method filter`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Get sign-in audit logs with invalid sign-in method
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&signInMethod=invalid_method`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 400);
    const errorRO = JSON.parse(getAuditLogsResult.text);
    t.is(errorRO.message, Messages.INVALID_SIGN_IN_METHOD);
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(`${currentTest} should filter sign-in audit logs by date range`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token, email, password } = adminUserRegisterInfo;

    // Get company ID by token
    const companyId = await getCompanyIdByToken(app, token);

    // Create a successful login
    await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFrom = yesterday.toISOString();
    const dateTo = tomorrow.toISOString();

    // Get sign-in audit logs filtered by date range
    const getAuditLogsResult = await request(app.getHttpServer())
      .get(`/sign-in-audit/logs?companyId=${companyId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getAuditLogsResult.status, 200);
    const auditLogsRO = JSON.parse(getAuditLogsResult.text);

    t.is(auditLogsRO.hasOwnProperty('logs'), true);
    t.true(auditLogsRO.logs.length >= 1);
  } catch (err) {
    console.error(err);
    throw err;
  }
});

test.serial(
  `${currentTest} should not show audit for login attempt with non-existent user in company logs`,
  async (t) => {
    try {
      const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
      const { token, email } = adminUserRegisterInfo;

      // Get company ID by token
      const companyId = await getCompanyIdByToken(app, token);

      // Attempt login with non-existent email
      const nonExistentEmail = `nonexistent_${faker.string.uuid()}@example.com`;
      const failedLoginResult = await request(app.getHttpServer())
        .post('/user/login/')
        .send({ email: nonExistentEmail, password: 'any_password', companyId })
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(failedLoginResult.status, 404);

      // Get sign-in audit logs
      const getAuditLogsResult = await request(app.getHttpServer())
        .get(`/sign-in-audit/logs?companyId=${companyId}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      t.is(getAuditLogsResult.status, 200);
      const auditLogsRO = JSON.parse(getAuditLogsResult.text);

      // Non-existent user login attempts should NOT be visible in company logs
      // because the user doesn't belong to the company
      const failedLogEntry = auditLogsRO.logs.find((log: any) => log.email === nonExistentEmail.toLowerCase());
      t.falsy(failedLogEntry);
    } catch (err) {
      console.error(err);
      throw err;
    }
  },
);
