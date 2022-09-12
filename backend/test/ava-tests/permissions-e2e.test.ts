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
import { faker } from '@faker-js/faker';
import { Messages } from '../../src/exceptions/text/messages';

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
    let createPermissionsResponse = await request(app.getHttpServer())
      .put(`/permissions/${createGroupRO.id}`)
      .send(permissionsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createPermissionsResponse.status, 200);
    let createPermissionsRO = JSON.parse(createPermissionsResponse.text);
    let { connection: connectionDTO, group: groupDTO, tables: tablesDTO } = permissionsDTO.permissions;
    let { connection, group, tables } = createPermissionsRO;
    t.is(connection.accessLevel, connectionDTO.accessLevel);
    t.is(group.accessLevel, groupDTO.accessLevel);
    t.is(connection.connectionId, connectionDTO.connectionId);
    t.is(group.groupId, groupDTO.groupId);
    for (const table of tables) {
      const tableInDto = tablesDTO.find((t) => t.tableName === table.tableName);
      for (const key in table.accessLevel) {
        t.is(table.accessLevel[key], tableInDto.accessLevel[key]);
      }
    }

    connectionAccessLevel = AccessLevelEnum.readonly;
    groupAccesssLevel = AccessLevelEnum.none;
    permissionsDTO = mockFactory.generateInternalPermissions(
      createConnectionRO.id,
      createGroupRO.id,
      connectionAccessLevel,
      groupAccesssLevel,
    );

    createPermissionsResponse = await request(app.getHttpServer())
      .put(`/permissions/${createGroupRO.id}`)
      .send(permissionsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    createPermissionsRO = JSON.parse(createPermissionsResponse.text);
    t.is(createPermissionsResponse.status, 200);
    t.is(uuidRegex.test(createPermissionsRO.connection.connectionId), true);
    t.is(createPermissionsRO.connection.accessLevel, connectionAccessLevel);
    t.is(uuidRegex.test(createPermissionsRO.group.groupId), true);
    t.is(createPermissionsRO.group.accessLevel, groupAccesssLevel);

    tables = createPermissionsRO.tables;
    tablesDTO = permissionsDTO.permissions.tables;
    for (const table of tables) {
      const tableInDto = tablesDTO.find((t) => t.tableName === table.tableName);
      for (const key in table.accessLevel) {
        t.is(table.accessLevel[key], tableInDto.accessLevel[key]);
      }
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when groupId not passed`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnectionInDocker, newGroup1 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnectionInDocker)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    let createConnectionRO = JSON.parse(createConnectionResponse.text);
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
    createGroupRO.id = '';
    let createPermissionsResponse = await request(app.getHttpServer())
      .put(`/permissions/${createGroupRO.id}`)
      .send(permissionsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createPermissionsResponse.status, 404);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when groupId passed in request is incorrect`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnectionInDocker, newGroup1 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnectionInDocker)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    let createConnectionRO = JSON.parse(createConnectionResponse.text);
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
    createGroupRO.id = faker.datatype.uuid();
    let createPermissionsResponse = await request(app.getHttpServer())
      .put(`/permissions/${createGroupRO.id}`)
      .send(permissionsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createPermissionsResponse.status, 400);
    const { message } = JSON.parse(createPermissionsResponse.text);
    t.is(message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

test(`${currentTest} should throw an exception when connectionId is incorrect`, async (t) => {
  try {
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { newConnectionInDocker, newGroup1 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnectionInDocker)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    let createConnectionRO = JSON.parse(createConnectionResponse.text);
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
    permissionsDTO.permissions.connection.connectionId = faker.datatype.uuid();
    let createPermissionsResponse = await request(app.getHttpServer())
      .put(`/permissions/${createGroupRO.id}`)
      .send(permissionsDTO)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createPermissionsResponse.status, 400);
    const { message } = JSON.parse(createPermissionsResponse.text);
    t.is(message, Messages.GROUP_NOT_FROM_THIS_CONNECTION);
  } catch (e) {
    console.error(e);
    throw e;
  }
});
