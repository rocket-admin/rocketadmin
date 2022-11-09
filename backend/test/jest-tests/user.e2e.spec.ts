import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as AWSMock from 'aws-sdk-mock';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { Connection } from 'typeorm';
import { ApplicationModule } from '../../src/app.module';
import { IUserInfo } from '../../src/entities/user/user.interface';
import { Messages } from '../../src/exceptions/text/messages';
import { Cacher } from '../../src/helpers/cache/cacher';
import { Constants } from '../../src/helpers/constants/constants';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { TestUtils } from '../utils/test.utils';

describe('User (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let testUtils: TestUtils;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();

    testUtils = moduleFixture.get<TestUtils>(TestUtils);
    await testUtils.resetDb();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    await Cacher.clearAllCache();
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
    AWSMock.restore('CognitoIdentityServiceProvider');
  });

  afterAll(async () => {
    try {
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      const connect = await app.get(Connection);
      if (connect.isConnected) {
        await connect.close();
      }
      await app.close();
    } catch (e) {
      console.error('After all user error: ' + e);
    }
  });

  describe('GET /user', () => {
    it('should user info for this user', async () => {
      try {
        const adminUserRegisterInfo = {
          email: 'firstUser@example.com',
          password: 'ahalai-Mahala1',
          name: 'Test User',
        };
        const registerAdminUserResponse = await request(app.getHttpServer())
          .post('/user/register/')
          .send(adminUserRegisterInfo)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
          registerAdminUserResponse,
        )}`;

        const getUserResult = await request(app.getHttpServer())
          .get('/user')
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const getUserRO: IUserInfo = JSON.parse(getUserResult.text);
        expect(uuidRegex.test(getUserRO.id)).toBeTruthy();
        expect(getUserRO.isActive).toBeFalsy();
        expect(getUserRO.email).toBe('firstUser@example.com');
        expect(getUserRO.hasOwnProperty('createdAt')).toBeTruthy();
        expect(getUserRO.portal_link).toBe(Messages.NO_STRIPE);
        expect(getUserRO.name).toBe(adminUserRegisterInfo.name);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('DELETE /user', () => {
    it('should return user deletion result', async () => {
      try {
        const adminUserRegisterInfo = {
          email: 'firstUser@example.com',
          password: 'ahalai-Mahala1',
        };
        const registerAdminUserResponse = await request(app.getHttpServer())
          .post('/user/register/')
          .send(adminUserRegisterInfo)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const registerAdminRO = JSON.parse(registerAdminUserResponse.text);
        const connectionAdminUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(
          registerAdminUserResponse,
        )}`;
        let getUserResult = await request(app.getHttpServer())
          .get('/user')
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getUserResult.status).toBe(200);
        const deleteUserResult = await request(app.getHttpServer())
          .put('/user/delete/')
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const deleteUserRO = JSON.parse(deleteUserResult.text);
        expect(deleteUserRO.email).toBe(adminUserRegisterInfo.email);
        getUserResult = await request(app.getHttpServer())
          .get('/user')
          .set('Cookie', connectionAdminUserToken)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getUserResult.status).toBe(401);
      } catch (err) {
        throw err;
      }
    });
  });
});
