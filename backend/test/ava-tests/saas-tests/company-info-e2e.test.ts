/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { TestUtils } from '../../utils/test.utils.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../../utils/user-with-different-permissions-utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

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
});

currentTest = 'GET /company/my';

test(`${currentTest} should return found company info for user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my')
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    t.is(foundCompanyInfo.status, 200);
    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
    t.is(Object.keys(foundCompanyInfoRO).length, 6);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('additional_info'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('address'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('updatedAt'), true);
  } catch (error) {
    console.error(error);
  }
});

currentTest = 'GET /company/my/full';

test(`${currentTest} should return full found company info for company admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('additional_info'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('address'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('updatedAt'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 8);
    t.is(foundCompanyInfoRO.hasOwnProperty('connections'), true);
    t.is(foundCompanyInfoRO.connections.length > 3, true);
    t.is(foundCompanyInfoRO.hasOwnProperty('invitations'), true);
    t.is(foundCompanyInfoRO.invitations.length, 0);
    t.is(Object.keys(foundCompanyInfoRO.connections[0]).length, 6);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('title'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('updatedAt'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('author'), true);
    t.is(foundCompanyInfoRO.connections[0].hasOwnProperty('groups'), true);
    t.is(foundCompanyInfoRO.connections[0].groups.length > 0, true);
    t.is(Object.keys(foundCompanyInfoRO.connections[0].groups[0]).length, 4);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('title'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('isMain'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].hasOwnProperty('users'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users.length > 0, true);
    t.is(Object.keys(foundCompanyInfoRO.connections[0].groups[0].users[0]).length, 7);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('email'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('role'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.connections[0].groups[0].users[0].hasOwnProperty('password'), false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return found company info for non-admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);
    t.is(Object.keys(foundCompanyInfoRO).length, 6);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('additional_info'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('address'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('updatedAt'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /company/my/email';

test(`${currentTest} should return found company infos for admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get(`/company/my/email/${testData.users.adminUserEmail}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);
    t.is(Array.isArray(foundCompanyInfoRO), true);
    t.is(foundCompanyInfoRO.length, 1);
    t.is(foundCompanyInfoRO[0].hasOwnProperty('id'), true);
    t.is(Object.keys(foundCompanyInfoRO[0]).length, 2);
    t.is(foundCompanyInfoRO[0].hasOwnProperty('name'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return found company infos for non-admin user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get(`/company/my/email/${testData.users.simpleUserEmail}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);
    t.is(Array.isArray(foundCompanyInfoRO), true);
    t.is(foundCompanyInfoRO.length, 1);
    t.is(Object.keys(foundCompanyInfoRO[0]).length, 2);
    t.is(foundCompanyInfoRO[0].hasOwnProperty('name'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});
