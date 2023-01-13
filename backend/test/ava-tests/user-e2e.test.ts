import test from 'ava';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { TestUtils } from '../utils/test.utils';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Constants } from '../../src/helpers/constants/constants';
import { IUserInfo } from '../../src/entities/user/user.interface';
import { faker } from '@faker-js/faker';

let app: INestApplication;
let currentTest: string;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  await app.init();
});

currentTest = 'GET /user';

test.only(`${currentTest} should user info for this user`, async (t) => {
  try {
    const adminUserRegisterInfo = {
      email: `${faker.random.words(1)}_${faker.internet.email()}`,
      password: faker.internet.password(),
      name: faker.name.firstName(),
    };

    const registerAdminUserResponse = await request(app.getHttpServer())
      .post('/user/register/')
      .send(adminUserRegisterInfo)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    console.log("🚀 ~ file: user-e2e.test.ts:42 ~ test.only ~ registerAdminUserResponse", registerAdminUserResponse.text)
    const connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
      registerAdminUserResponse,
    )}`;

    const getUserResult = await request(app.getHttpServer())
      .get('/user')
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    console.log("🚀 ~ file: user-e2e.test.ts:52 ~ test.only ~ getUserResult", getUserResult.text)
    const getUserRO: IUserInfo = JSON.parse(getUserResult.text);
    t.is(uuidRegex.test(getUserRO.id), true);
    t.is(getUserRO.isActive, false);
    t.is(getUserRO.email, adminUserRegisterInfo.email);
    t.is(getUserRO.hasOwnProperty('createdAt'), true);
    t.is(getUserRO.portal_link, null);
    t.is(getUserRO.name, adminUserRegisterInfo.name);
  } catch (err) {
    throw err;
  }
  t.pass();
});

currentTest = 'DELETE /user';

test(`${currentTest} should return user deletion result`, async (t) => {
  try {
    const adminUserRegisterInfo = {
      email: `${faker.random.words(1)}_${faker.internet.email()}`,
      password: faker.internet.password(),
      name: faker.name.firstName(),
    };
    const registerAdminUserResponse = await request(app.getHttpServer())
      .post('/user/register/')
      .send(adminUserRegisterInfo)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const registerAdminRO = JSON.parse(registerAdminUserResponse.text);
    console.log("🚀 ~ file: user-e2e.test.ts:79 ~ test ~ registerAdminRO", registerAdminRO)
    const connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
      registerAdminUserResponse,
    )}`;

    let getUserResult = await request(app.getHttpServer())
      .get('/user')
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    console.log("🚀 ~ file: user-e2e.test.ts:89 ~ test ~ getUserResult", getUserResult.text)
    t.is(getUserResult.status, 200);
    const deleteUserResult = await request(app.getHttpServer())
      .put('/user/delete/')
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserRO = JSON.parse(deleteUserResult.text);
    console.log("🚀 ~ file: user-e2e.test.ts:95 ~ test ~ deleteUserRO", deleteUserRO)
    t.is(deleteUserRO.email, adminUserRegisterInfo.email);
    getUserResult = await request(app.getHttpServer())
      .get('/user')
      .set('Cookie', connectionAdminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getUserResult.status, 401);
  } catch (err) {
    throw err;
  }
  t.pass();
});
