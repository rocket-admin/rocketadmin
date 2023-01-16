import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ApplicationModule } from '../../src/app.module.js';
import { IUserInfo } from '../../src/entities/user/user.interface.js';
import { Messages } from '../../src/exceptions/text/messages.js';
import { Cacher } from '../../src/helpers/cache/cacher.js';
import { Constants } from '../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import { MockFactory } from '../mock.factory.js';
import { TestUtils } from '../utils/test.utils.js';
import cookieParser = require('cookie-parser');

describe('Stripe webhook endpoint tests', () => {
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();

  type RegisterUserData = {
    email: string;
    password: string;
    name: string;
  };

  const adminUserRegisterInfo: RegisterUserData = {
    email: 'firstUser@example.com',
    password: 'ahalai-mahalai',
    name: 'Test_User',
  };

  jest.setTimeout(30000);
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    testUtils = moduleFixture.get<TestUtils>(TestUtils);
  });

  afterEach(async () => {
    await Cacher.clearAllCache();
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
  });

  beforeEach(async () => {
    await testUtils.resetDb();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /webhook/', () => {
    it('should set stripe id in user entity', async () => {
      const registerAdminUserResponse = await request(app.getHttpServer())
        .post('/user/register/')
        .send(adminUserRegisterInfo)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      expect(registerAdminUserResponse.status).toBe(201);

      const connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
        registerAdminUserResponse,
      )}`;
      console.log(
        '🚀 ~ file: stripe-webhook.e2e.spec.ts ~ line 70 ~ it ~ connectionAdminUserToken',
        connectionAdminUserToken,
      );

      const getUserResult = await request(app.getHttpServer())
        .get('/user')
        .set('Cookie', connectionAdminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const getUserRO: IUserInfo = JSON.parse(getUserResult.text);
      console.log('🚀 ~ file: stripe-webhook.e2e.spec.ts ~ line 72 ~ describe ~ getUserRO', getUserRO);

      expect(getUserRO.isActive).toBeFalsy();
      expect(getUserRO.email).toBe('firstUser@example.com');
      expect(getUserRO.hasOwnProperty('createdAt')).toBeTruthy();
      expect(getUserRO.portal_link).toBe(Messages.NO_STRIPE);
      expect(getUserRO.name).toBe(adminUserRegisterInfo.name);

      const stripeWebhookResult = await request(app.getHttpServer())
        .post('/webhook')
        .set('Cookie', connectionAdminUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(stripeWebhookResult.status).toBe(400);
    });
  });
});
