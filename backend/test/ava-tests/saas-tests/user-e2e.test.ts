/* eslint-disable @typescript-eslint/no-unused-vars */
import test from 'ava';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../../src/app.module.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { IUserInfo } from '../../../src/entities/user/user.interface.js';
import { faker } from '@faker-js/faker';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import cookieParser from 'cookie-parser';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';

let app: INestApplication;
let currentTest: string;
let testUtils: TestUtils;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  app.getHttpServer().listen(0);
});

currentTest = 'GET /user';

test(`${currentTest} should user info for this user`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    const getUserResult = await request(app.getHttpServer())
      .get('/user')
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');
    const getUserRO: IUserInfo = JSON.parse(getUserResult.text);
    t.is(uuidRegex.test(getUserRO.id), true);
    t.is(getUserRO.isActive, false);
    t.is(getUserRO.email, adminUserRegisterInfo.email);
    t.is(getUserRO.hasOwnProperty('createdAt'), true);
    t.is(getUserRO.portal_link, null);
  } catch (err) {
    throw err;
  }
  t.pass();
});

currentTest = 'DELETE /user';

test(`${currentTest} should return user deletion result`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { token } = adminUserRegisterInfo;

    let getUserResult = await request(app.getHttpServer())
      .get('/user')
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getUserResult.status, 200);
    const deleteUserResult = await request(app.getHttpServer())
      .put('/user/delete/')
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserRO = JSON.parse(deleteUserResult.text);
    t.is(deleteUserRO.email, adminUserRegisterInfo.email);
    getUserResult = await request(app.getHttpServer())
      .get('/user')
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getUserResult.status, 401);
  } catch (err) {
    throw err;
  }
  t.pass();
});

test(`${currentTest} should return expiration token when user login`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { email, password } = adminUserRegisterInfo;

    const loginUserResult = await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const loginUserRO = JSON.parse(loginUserResult.text);
    t.is(loginUserRO.hasOwnProperty('expires'), true);
  } catch (err) {
    throw err;
  }
  t.pass();
});

test(`${currentTest} reject authorization when try to login with wrong password`, async (t) => {
  try {
    const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
    const { email, password } = adminUserRegisterInfo;

    const realPassword = password;
    const wrongPassword = 'wrong password';
    const wrongUserLogin = await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password: wrongPassword })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(wrongUserLogin.status, 401);

    const loginUserResult = await request(app.getHttpServer())
      .post('/user/login/')
      .send({ email, password: realPassword })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const loginUserRO = JSON.parse(loginUserResult.text);
    t.is(loginUserRO.hasOwnProperty('expires'), true);
  } catch (err) {
    throw err;
  }
  t.pass();
});
