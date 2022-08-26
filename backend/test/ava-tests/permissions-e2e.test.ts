import { INestApplication } from '@nestjs/common';
import { TestUtils } from '../utils/test.utils';
import { MockFactory } from '../mock.factory';
import test from 'ava';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '../../src/exceptions/all-exceptions.filter';
import { Connection } from 'typeorm';
import { registerUserAndReturnUserInfo } from '../utils/register-user-and-return-user-info';
import { getTestData } from '../utils/get-test-data';
import * as request from 'supertest';
import { AccessLevelEnum } from '../../src/enums';

let app: INestApplication;
let testUtils: TestUtils;
const mockFactory = new MockFactory();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  app.getHttpServer().listen(0);
  testUtils = moduleFixture.get<TestUtils>(TestUtils);
  await testUtils.resetDb();
});

test.after.always('Close app connection', async () => {
  try {
    const connect = await app.get(Connection);
    await testUtils.shutdownServer(app.getHttpAdapter());
    if (connect.isConnected) {
      await connect.close();
    }
    await app.close();
  } catch (e) {
    console.error('After permission e2e error: ' + e);
  }
});

let currentTest = 'PUT permissions/:slug';
test(`${currentTest} should return created permissions`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnectionInDocker, newGroup1 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnectionInDocker)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    console.log('-> createConnectionRO', createConnectionRO);
    t.is(createConnectionResponse.status, 201);

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${createConnectionRO.id}`)
      .send(newGroup1)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    t.is(createGroupResponse.status, 201);

    let connectionAccessLevel = AccessLevelEnum.none;
    let groupAccesssLevel = AccessLevelEnum.edit;
    let permissionsDTO = mockFactory.generateInternalPermissions(
      createConnectionRO.id,
      createGroupRO.id,
      connectionAccessLevel,
      groupAccesssLevel,
    );
    let dtoTables = permissionsDTO.permissions.tables;
    let createPermissionsResponse = await request(app.getHttpServer())
      .put(`/permissions/${createGroupRO.id}`)
      .send(permissionsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createPermissionsResponse.status, 200);
    let createPermissionsRO = JSON.parse(createPermissionsResponse.text);
    console.log('-> createPermissionsRO', createPermissionsRO);
  } catch (e) {
    console.error(e);
    throw e;
  }
});
