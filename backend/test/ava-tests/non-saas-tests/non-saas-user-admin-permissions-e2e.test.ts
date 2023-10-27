/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AccessLevelEnum, QueryOrderingEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { compareTableWidgetsArrays } from '../../utils/compare-table-widgets-arrays.js';
import { TestUtils } from '../../utils/test.utils.js';
import { createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection } from '../../utils/user-with-different-permissions-utils.js';
import { inviteUserInCompanyAndAcceptInvitation } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { ErrorsMessages } from '../../../src/exceptions/custom-exceptions/messages/custom-errors-messages.js';

let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

const mockFactory = new MockFactory();
const newConnectionToPostgres = mockFactory.generateConnectionToTestPostgresDBInDocker();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
  setSaasEnvVariable();
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

test.after.always('Close app connection', async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
});

// Connection controller
currentTest = 'GET /connections/';

test(`${currentTest} should return connections, where second user have access`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const findAll = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');

    t.is(findAll.status, 200);

    const result = findAll.body.connections;
    t.is(result.length, 1);
    t.is(result[0].hasOwnProperty('connection'), true);
    t.is(result[0].hasOwnProperty('accessLevel'), true);
    t.is(result[0].accessLevel, AccessLevelEnum.edit);
    t.is(uuidRegex.test(result[0].connection.id), true);
    t.is(result[0].hasOwnProperty('accessLevel'), true);
    t.is(result[0].connection.hasOwnProperty('host'), true);
    t.is(result[0].connection.hasOwnProperty('host'), true);
    t.is(typeof result[0].connection.port, 'number');
    t.is(result[0].connection.hasOwnProperty('port'), true);
    t.is(result[0].connection.hasOwnProperty('username'), true);
    t.is(result[0].connection.hasOwnProperty('database'), true);
    t.is(result[0].connection.hasOwnProperty('sid'), true);
    t.is(result[0].connection.hasOwnProperty('createdAt'), true);
    t.is(result[0].connection.hasOwnProperty('updatedAt'), true);
    t.is(result[0].connection.hasOwnProperty('password'), false);
    t.is(result[0].connection.hasOwnProperty('groups'), false);
    t.is(result[0].connection.hasOwnProperty('author'), false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /connection/one/:slug';
test(`${currentTest} should return a found connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const searchedConnectionId = testData.connections.firstId;
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${searchedConnectionId}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    t.is(findOneResponce.status, 200);

    const result = findOneResponce.body.connection;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newConnectionToPostgres.title);
    t.is(result.type, 'postgres');
    t.is(result.host, newConnectionToPostgres.host);
    t.is(typeof result.port, 'number');
    t.is(result.port, newConnectionToPostgres.port);
    t.is(result.username, 'postgres');
    t.is(result.database, newConnectionToPostgres.database);
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), false);
    t.is(result.hasOwnProperty('author'), false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when you do not have permission in this connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const searchedConnectionId = testData.connections.secondId;
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${searchedConnectionId}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    t.is(findOneResponce.status, 200);
    const findOneRO = JSON.parse(findOneResponce.text);
    const connectionKeys: Array<string> = Object.keys(findOneRO.connection);
    for (const keyName of connectionKeys) {
      t.is(Constants.CONNECTION_KEYS_NONE_PERMISSION.includes(keyName), true);
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT /connection';

test(`${currentTest} should return updated connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const updateConnection = mockFactory.generateUpdateConnectionDto();
    const updateConnectionResponse = await request(app.getHttpServer())
      .put(`/connection/${testData.connections.firstId}`)
      .send(updateConnection)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateConnectionResponse.status, 200);
    const result = updateConnectionResponse.body.connection;
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, 'Updated Test Connection');
    t.is(result.type, 'postgres');
    t.is(result.host, 'testing_nestjs');
    t.is(typeof result.port, 'number');
    t.is(result.port, 5432);
    t.is(result.username, 'admin');
    t.is(result.database, 'testing_nestjs');
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return throw an exception, when you try update a connection without permissions in it`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const updateConnection = mockFactory.generateUpdateConnectionDto();
    const updateConnectionResponse = await request(app.getHttpServer())
      .put(`/connection/${testData.connections.secondId}`)
      .send(updateConnection)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateConnectionResponse.status, 403);
    t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'DELETE /connection/:slug';

test(`${currentTest} should return delete result`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const response = await request(app.getHttpServer())
      .put(`/connection/delete/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const result = response.body;

    //deleted connection not found in database
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findOneResponce.status, 400);
    const { message } = JSON.parse(findOneResponce.text);
    t.is(message, Messages.CONNECTION_NOT_FOUND);

    t.is(response.status, 200);

    t.is(result.hasOwnProperty('id'), false);
    t.is(result.title, newConnectionToPostgres.title);
    t.is(result.type, 'postgres');
    t.is(result.host, newConnectionToPostgres.host);
    t.is(typeof result.port, 'number');
    t.is(result.port, newConnectionToPostgres.port);
    t.is(result.username, 'postgres');
    t.is(result.database, newConnectionToPostgres.database);
    t.is(result.sid, null);
    t.is(result.hasOwnProperty('createdAt'), true);
    t.is(result.hasOwnProperty('updatedAt'), true);
    t.is(result.hasOwnProperty('password'), false);
    t.is(result.hasOwnProperty('groups'), false);
    t.is(result.hasOwnProperty('author'), false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when you try to delete connection without permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const response = await request(app.getHttpServer())
      .put(`/connection/delete/${testData.connections.secondId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);

    //connection wasn't deleted
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findOneResponce.status, 200);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'POST /connection/group/:slug';

test(`${currentTest} should return a created group`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 201);
    const result = JSON.parse(createGroupResponse.text);
    t.is(uuidRegex.test(result.id), true);
    t.is(result.title, newGroup1.title);
    t.is(result.hasOwnProperty('users'), true);
    t.is(typeof result.users, 'object');
    t.is(result.users.length, 1);
    t.is(result.users[0].email, testData.users.simpleUserEmail);
    t.is(result.users[0].isActive, true);
    t.is(uuidRegex.test(result.users[0].id), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when you try add group in connection without permission in it`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.secondId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 403);
    t.is(JSON.parse(createGroupResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT /connection/group/delete/:slug';

test(`${currentTest} should return connection without deleted group result`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // create group in connection
    let result = createGroupResponse.body;

    t.is(createGroupResponse.status, 201);

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, newGroup1.title);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    let response = await request(app.getHttpServer())
      .put(`/connection/group/delete/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId: createGroupRO.id })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    //after deleting group
    result = response.body;
    t.is(response.status, 200);
    t.is(result.hasOwnProperty('title'), true);
    t.is(result.title, createGroupRO.title);
    t.is(result.isMain, false);
    // check that group was deleted

    response = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    result = JSON.parse(response.text);
    t.is(result.length, 1);
    const groupId = result[0].group.id;
    t.is(uuidRegex.test(groupId), true);
    t.is(result[0].group.hasOwnProperty('title'), true);
    t.is(result[0].accessLevel, AccessLevelEnum.edit);

    const index = result.findIndex((el: any) => {
      return el.group.title === 'Admin';
    });

    t.is(index >= 0, true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when you try delete group in connection without permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.secondId}`)
      .set('Cookie', testData.users.adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // create group in connection
    const result = createGroupResponse.body;

    t.is(createGroupResponse.status, 201);

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, newGroup1.title);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const response = await request(app.getHttpServer())
      .put(`/connection/group/delete/${testData.connections.secondId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId: createGroupRO.id })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /connection/groups/:slug';

test(`${currentTest} return should groups in connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 201);

    const response = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    const result = JSON.parse(response.text);
    const groupId = result[0].group.id;
    t.is(uuidRegex.test(groupId), true);
    t.is(result[1].group.hasOwnProperty('title'), true);
    t.is(result[0].accessLevel, AccessLevelEnum.edit);

    const index = result.findIndex((el: any) => el.group.title === 'Admin');

    t.is(index >= 0, true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} it should throw an exception, when you try get groups in connection, where you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.secondId}`)
      .set('Cookie', testData.users.adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 201);

    const response = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.secondId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 200);

    const result = JSON.parse(response.text);
    t.is(result.length, 0);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /connection/permissions';

test(`${currentTest} should return permissions object for current group in current connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);
    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/connection/permissions?connectionId=${testData.connections.firstId}&groupId=${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const result = JSON.parse(response.text);
    t.is(response.status, 200);

    t.is(result.hasOwnProperty('connection'), true);
    t.is(result.hasOwnProperty('group'), true);
    t.is(result.hasOwnProperty('tables'), true);
    t.is(typeof result.connection, 'object');
    t.is(typeof result.group, 'object');
    t.is(result.connection.connectionId, testData.connections.firstId);
    t.is(result.group.groupId, groupId);
    t.is(result.connection.accessLevel, AccessLevelEnum.edit);
    t.is(result.group.accessLevel, AccessLevelEnum.edit);
    t.is(typeof result.tables, 'object');

    const { tables } = result;
    const tableIndex = tables.findIndex((table) => table.tableName === testData.firstTableInfo.testTableName);
    t.is(tables.length > 0, true);
    t.is(typeof tables[0], 'object');
    t.is(tables[tableIndex].hasOwnProperty('accessLevel'), true);
    t.is(tables[tableIndex].accessLevel.visibility, false);
    t.is(tables[tableIndex].accessLevel.readonly, false);
    t.is(tables[tableIndex].accessLevel.add, false);
    t.is(tables[tableIndex].accessLevel.delete, false);
    t.is(tables[tableIndex].accessLevel.edit, false);
    t.is(tables[tableIndex].accessLevel.readonly, false);
    t.is(tables[tableIndex].accessLevel.add, false);
    t.is(tables[tableIndex].accessLevel.visibility, false);
    t.is(tables[tableIndex].accessLevel.readonly, false);
    t.is(tables[tableIndex].accessLevel.edit, false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /connection/user/permissions';

test(`${currentTest} should return permissions object for current group in current connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);
    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/connection/user/permissions?connectionId=${testData.connections.firstId}&groupId=${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    const result = JSON.parse(response.text);

    t.is(result.hasOwnProperty('connection'), true);
    t.is(result.hasOwnProperty('group'), true);
    t.is(result.hasOwnProperty('tables'), true);
    t.is(typeof result.connection, 'object');
    t.is(typeof result.group, 'object');
    t.is(result.connection.connectionId, testData.connections.firstId);
    t.is(result.group.groupId, groupId);
    t.is(result.connection.accessLevel, AccessLevelEnum.edit);
    t.is(result.group.accessLevel, AccessLevelEnum.edit);
    t.is(typeof result.tables, 'object');

    const { tables } = result;
    const tableIndex = tables.findIndex((table) => table.tableName === testData.firstTableInfo.testTableName);
    t.is(tables.length > 0, true);
    t.is(typeof tables[0], 'object');
    t.is(tables[tableIndex].hasOwnProperty('accessLevel'), true);
    t.is(tables[tableIndex].accessLevel.visibility, true);
    t.is(tables[tableIndex].accessLevel.readonly, false);
    t.is(tables[tableIndex].accessLevel.add, true);
    t.is(tables[tableIndex].accessLevel.delete, true);
    t.is(tables[tableIndex].accessLevel.edit, true);
    t.is(tables[tableIndex].accessLevel.readonly, false);
    t.is(tables[tableIndex].accessLevel.add, true);
    t.is(tables[tableIndex].accessLevel.visibility, true);
    t.is(tables[tableIndex].accessLevel.readonly, false);
    t.is(tables[tableIndex].accessLevel.edit, true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return permissions object for current group in current connection for current user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.secondId}`)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/connection/user/permissions?connectionId=${testData.connections.secondId}&groupId=${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    const result = JSON.parse(response.text);

    t.is(result.hasOwnProperty('connection'), true);
    t.is(result.hasOwnProperty('group'), true);
    t.is(result.hasOwnProperty('tables'), true);
    t.is(typeof result.connection, 'object');
    t.is(typeof result.group, 'object');
    t.is(result.connection.connectionId, testData.connections.secondId);
    t.is(result.group.groupId, groupId);
    t.is(result.connection.accessLevel, AccessLevelEnum.none);
    t.is(result.group.accessLevel, AccessLevelEnum.none);
    t.is(typeof result.tables, 'object');

    const { tables } = result;
    const tableIndex = tables.findIndex((table) => table.tableName === testData.secondTableInfo.testTableName);
    t.is(tables.length > 0, true);
    t.is(typeof tables[0], 'object');
    t.is(tables[tableIndex].hasOwnProperty('accessLevel'), true);
    t.is(tables[tableIndex].accessLevel.visibility, false);
    t.is(tables[tableIndex].accessLevel.readonly, false);
    t.is(tables[tableIndex].accessLevel.add, false);
    t.is(tables[tableIndex].accessLevel.delete, false);
    t.is(tables[tableIndex].accessLevel.edit, false);
    t.is(tables[tableIndex].accessLevel.edit, false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

//****************************** GROUP CONTROLLER
currentTest = 'GET /groups/';

test(`${currentTest} should return found groups with current user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/groups/`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);
    const { groups, groupsCount } = getGroupsRO;
    t.is(groupsCount, 1);
    t.is(groups.length, 1);
    t.is(groups[0].hasOwnProperty('group'), true);
    t.is(groups[0].hasOwnProperty('accessLevel'), true);
    t.is(uuidRegex.test(groups[0].group.id), true);
    t.is(groups[0].group.hasOwnProperty('title'), true);
    t.is(groups[0].group.hasOwnProperty('isMain'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /group/users/:slug';

test(`${currentTest} it should return users in group`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/group/users/${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getUsersRO = JSON.parse(response.text);
    t.is(getUsersRO.length, 2);
    t.is(getUsersRO[0].id === getUsersRO[1].id, false);
    t.is(getUsersRO[0].hasOwnProperty('createdAt'), true);
    t.is(getUsersRO[0].hasOwnProperty('password'), false);
    t.is(getUsersRO[0].hasOwnProperty('isActive'), true);
    t.is(getUsersRO[0].hasOwnProperty('email'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} it should throw an exception when you try to receive user in group where you dont have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.secondId}`)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/group/users/${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getUsersRO = JSON.parse(response.text);
    t.is(getUsersRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT /group/user';

test(`${currentTest} should return group with added user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(
      testData.users.adminUserToken,
      undefined,
      app,
      undefined,
    );

    const email = thirdTestUser.email;

    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text).group;
    t.is(uuidRegex.test(addUserInGroupRO.id), true);
    t.is(addUserInGroupRO.hasOwnProperty('title'), true);
    t.is(addUserInGroupRO.hasOwnProperty('isMain'), true);
    t.is(addUserInGroupRO.hasOwnProperty('users'), true);
    const { users } = addUserInGroupRO;
    t.is(users.length, 3);
    t.is(users[0].id === users[1].id, false);
    t.is(users[1].id === users[2].id, false);
    t.is(users[2].id === users[0].id, false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw exception, when user email not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
    t.is(addUserInGroupResponse.status, 400);
    t.is(addUserInGroupRO.message, ErrorsMessages.VALIDATION_FAILED);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw exception, when group id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;
    const email = faker.internet.email();
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
    t.is(addUserInGroupResponse.status, 400);
    t.is(addUserInGroupRO.message, Messages.GROUP_ID_MISSING);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw exception, when group id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const email = faker.internet.email();
    const groupId = faker.string.uuid();
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
    t.is(addUserInGroupResponse.status, 400);
    t.is(addUserInGroupRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'DELETE /group/:slug';

test(`${currentTest} should delete result after group deletion`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);

    const groupId = JSON.parse(createGroupResponse.text).id;
    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
    t.is(deleteGroupRO.title, newGroup1.title);
    t.is(deleteGroupRO.isMain, false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when you try delete admin group`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;
    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
    t.is(deleteGroupRO.message, Messages.CANT_DELETE_ADMIN_GROUP);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when group id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(deleteGroupResponse.status, 404);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when group id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);

    const groupId = faker.string.uuid();
    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/${groupId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
    t.is(deleteGroupRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT /group/user/delete';

test(`${currentTest} should return group without deleted user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(
      testData.users.adminUserToken,
      undefined,
      app,
      undefined,
    );

    const email = thirdTestUser.email;

    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(addUserInGroupResponse.status, 200);

    const deleteUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user/delete')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
    t.is(uuidRegex.test(deleteUserInGroupRO.id), true);
    t.is(deleteUserInGroupRO.hasOwnProperty('title'), true);
    t.is(deleteUserInGroupRO.hasOwnProperty('isMain'), true);
    t.is(deleteUserInGroupRO.hasOwnProperty('users'), true);
    const { users } = deleteUserInGroupRO;
    t.is(users.length, 2);
    t.is(users[0].id === users[1].id, false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw exception, when user email not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(
      testData.users.adminUserToken,
      undefined,
      app,
      undefined,
    );

    const email = thirdTestUser.email;

    const deleteUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user/delete')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
    t.is(deleteUserInGroupRO.message, ErrorsMessages.VALIDATION_FAILED);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw exception, when group id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(
      testData.users.adminUserToken,
      undefined,
      app,
      undefined,
    );

    const email = thirdTestUser.email;

    const deleteUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user/delete')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
    t.is(deleteUserInGroupRO.message, Messages.GROUP_ID_MISSING);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw exception, when group id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    let groupId = getGroupsRO[0].group.id;
    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(
      testData.users.adminUserToken,
      undefined,
      app,
      undefined,
    );

    const email = thirdTestUser.email;

    groupId = faker.string.uuid();
    const deleteUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user/delete')
      .set('Cookie', testData.users.simpleUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
    t.is(deleteUserInGroupRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

//****************************** PERMISSION CONTROLLER

currentTest = 'PUT permissions/:slug';

test(`${currentTest} should return created complex permissions object when you create permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        accessLevel: AccessLevelEnum.readonly,
        connectionId: testData.connections.firstId,
      },
      group: {
        accessLevel: AccessLevelEnum.readonly,
        groupId: newGroupId,
      },
      tables: [
        {
          accessLevel: {
            add: true,
            delete: true,
            edit: false,
            readonly: false,
            visibility: true,
          },
          tableName: testData.firstTableInfo.testTableName,
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
    t.is(createOrUpdatePermissionResponse.status, 200);
    t.is(JSON.stringify(createOrUpdatePermissionRO.connection), JSON.stringify(permissions.connection));
    t.is(JSON.stringify(createOrUpdatePermissionRO.group), JSON.stringify(permissions.group));
    t.is(JSON.stringify(createOrUpdatePermissionRO.tables), JSON.stringify(permissions.tables));
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return updated complex permissions object when you update permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    let permissions = {
      connection: {
        accessLevel: AccessLevelEnum.readonly,
        connectionId: testData.connections.firstId,
      },
      group: {
        accessLevel: AccessLevelEnum.readonly,
        groupId: newGroupId,
      },
      tables: [
        {
          accessLevel: {
            add: true,
            delete: true,
            edit: false,
            readonly: false,
            visibility: true,
          },
          tableName: testData.firstTableInfo.testTableName,
        },
      ],
    };

    let createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    let createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
    JSON.stringify(createOrUpdatePermissionRO);
    t.is(createOrUpdatePermissionResponse.status, 200);
    t.is(JSON.stringify(createOrUpdatePermissionRO.connection), JSON.stringify(permissions.connection));
    t.is(JSON.stringify(createOrUpdatePermissionRO.group), JSON.stringify(permissions.group));
    t.is(JSON.stringify(createOrUpdatePermissionRO.tables), JSON.stringify(permissions.tables));

    //************************ WHEN YOU UPDATE PERMISSIONS

    permissions = {
      connection: {
        accessLevel: AccessLevelEnum.none,
        connectionId: testData.connections.firstId,
      },
      group: {
        accessLevel: AccessLevelEnum.readonly,
        groupId: newGroupId,
      },
      tables: [
        {
          accessLevel: {
            add: false,
            delete: false,
            edit: true,
            readonly: false,
            visibility: true,
          },
          tableName: testData.firstTableInfo.testTableName,
        },
      ],
    };

    createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
    JSON.stringify(createOrUpdatePermissionRO);
    t.is(createOrUpdatePermissionResponse.status, 200);
    t.is(JSON.stringify(createOrUpdatePermissionRO.connection), JSON.stringify(permissions.connection));
    t.is(JSON.stringify(createOrUpdatePermissionRO.group), JSON.stringify(permissions.group));
    t.is(JSON.stringify(createOrUpdatePermissionRO.tables), JSON.stringify(permissions.tables));
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when you try change admin group`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.edit,
      },
      group: {
        groupId: testData.groups.firstAdminGroupId,
        accessLevel: AccessLevelEnum.none,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: true,
            readonly: false,
            add: true,
            delete: true,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${testData.groups.firstAdminGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
    t.is(createOrUpdatePermissionResponse.status, 400);
    t.is(createOrUpdatePermissionRO.message, Messages.CANNOT_CHANGE_ADMIN_GROUP);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

//****************************** TABLE CONTROLLER

currentTest = 'GET /connection/tables/:slug';

test(`${currentTest} should return all tables in connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    // create group without visibility table permission
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 200);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    t.is(getTablesInConnectionRO.length > 0, true);
    const tableIndex = getTablesInConnectionRO.findIndex(
      (tableItem) => tableItem.table === testData.firstTableInfo.testTableName,
    );
    t.is(getTablesInConnectionRO[tableIndex].table, testData.firstTableInfo.testTableName);
    t.is(typeof getTablesInConnectionRO[tableIndex].permissions, 'object');
    const { visibility, readonly, add, delete: del, edit } = getTablesInConnectionRO[tableIndex].permissions;
    t.is(visibility, true);
    t.is(readonly, false);
    t.is(del, true);
    t.is(edit, true);
    t.is(add, true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when connection id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 404);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    // create group without visibility table permission
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: 'users',
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeConnectionId = faker.string.uuid();
    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/${fakeConnectionId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    t.is(getTablesInConnectionRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /table/rows/:slug';

test(`${currentTest} should return found rows from table`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/table/rows/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 200);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    const { rows, primaryColumns, pagination, sortable_by, structure, foreignKeys } = getTablesInConnectionRO;
    t.is(rows.length, Constants.DEFAULT_PAGINATION.perPage);
    t.is(primaryColumns.length, 1);
    t.is(primaryColumns[0].column_name, 'id');
    t.is(primaryColumns[0].data_type, 'integer');
    t.is(sortable_by.length, 0);
    t.is(structure.length, 5);
    t.is(foreignKeys.length, 0);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/table/rows/?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 404);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeId = faker.string.uuid();
    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/table/rows/${fakeId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    t.is(getTablesInConnectionRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/table/rows/${testData.connections.firstId}?tableName=${fakeTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    t.is(getTablesInConnectionRO.message, Messages.TABLE_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /table/structure/:slug';

test(`${currentTest} should return table structure`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 200);
    const getTableStructureRO = JSON.parse(getTablesStructure.text);
    const { structure, primaryColumns, foreignKeys, readonly_fields, table_widgets } = getTableStructureRO;
    t.is(structure.length, 5);
    t.is(primaryColumns.length, 1);
    t.is(primaryColumns[0].column_name, 'id');
    t.is(primaryColumns[0].data_type, 'integer');
    t.is(readonly_fields.length, 0);
    t.is(table_widgets.length, 0);
    t.is(foreignKeys.length, 0);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 404);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeConnectionId = faker.string.uuid();
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${fakeConnectionId}?tableName=users`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when table name not passed in request`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${testData.connections.firstId}?tableName=`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.TABLE_NAME_MISSING);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${testData.connections.firstId}?tableName=${fakeTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.TABLE_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'POST /table/row/:slug';

test(`${currentTest} should return added row`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();

    const created_at = new Date();
    const updated_at = new Date();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTable.status, 201);
    t.is(addRowInTableRO.row.hasOwnProperty('id'), true);
    t.is(addRowInTableRO.row[testData.firstTableInfo.testTableColumnName], randomName);
    t.is(addRowInTableRO.row[testData.firstTableInfo.testTableSecondColumnName], randomEmail);
    t.is(addRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(addRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(addRowInTableRO.hasOwnProperty('structure'), true);
    t.is(addRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(addRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(addRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();

    const created_at = new Date();
    const updated_at = new Date();
    const fakeConnectionId = faker.string.uuid();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${fakeConnectionId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();

    const created_at = new Date();
    const updated_at = new Date();
    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${testData.connections.firstId}?tableName=${fakeTableName}`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.TABLE_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT /table/row/:slug';

test(`${currentTest} should return updated row`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createOrUpdatePermissionResponse.status, 200);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();

    const created_at = new Date();
    const updated_at = new Date();
    const updateRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=2`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(updateRowInTable.text);
    t.is(updateRowInTable.status, 200);
    t.is(addRowInTableRO.row.hasOwnProperty('id'), true);
    t.is(addRowInTableRO.row[testData.firstTableInfo.testTableColumnName], randomName);
    t.is(addRowInTableRO.row[testData.firstTableInfo.testTableSecondColumnName], randomEmail);
    t.is(addRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(addRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(addRowInTableRO.hasOwnProperty('structure'), true);
    t.is(addRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(addRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(addRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();

    const created_at = new Date();
    const updated_at = new Date();
    const fakeConnectionId = faker.string.uuid();
    const addRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${fakeConnectionId}?tableName=${testData.firstTableInfo.testTableName}&id=1`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();

    const created_at = new Date();
    const updated_at = new Date();
    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const addRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${testData.connections.firstId}?tableName=${fakeTableName}&id=1`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.TABLE_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'DELETE /table/row/:slug';

test(`${currentTest} should return delete result`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    // create group without visibility table permission
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=1`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(deleteRowInTable.status, 200);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeConnectionId = faker.string.uuid();
    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${fakeConnectionId}?tableName=${testData.firstTableInfo.testTableName}&id=1`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteRowInTableRO = JSON.parse(deleteRowInTable.text);
    t.is(deleteRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
    t.is(deleteRowInTable.status, 400);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);
    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${testData.connections.firstId}?tableName=${fakeTableName}&id=1`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteRowInTabbleRO = JSON.parse(deleteRowInTable.text);
    t.is(deleteRowInTabbleRO.message, Messages.TABLE_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /table/row/:slug';

test(`${currentTest} `, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    // create group without visibility table permission
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const getRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=5`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getRowInTableRO = JSON.parse(getRowInTable.text);
    t.is(getRowInTable.status, 200);
    t.is(getRowInTableRO.row.id, 5);
    t.is(getRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(getRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(getRowInTableRO.hasOwnProperty('structure'), true);
    t.is(getRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(getRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(getRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeConnectionId = faker.string.uuid();
    const addRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${fakeConnectionId}?tableName=${testData.firstTableInfo.testTableName}&id=5`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    // create group without visibility table permission
    const newGroup1 = mockFactory.generateCreateGroupDto1();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${testData.connections.firstId}`)
      .set('Cookie', testData.users.simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: testData.connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: testData.firstTableInfo.testTableName,
          accessLevel: {
            visibility: false,
            readonly: true,
            add: false,
            delete: false,
            edit: false,
          },
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createOrUpdatePermissionResponse.status, 200);

    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const addRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${testData.connections.firstId}?tableName=${fakeTableName}&id=5`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.TABLE_NOT_FOUND);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

//****************************** TABLE LOGS CONTROLLER

currentTest = 'GET /logs/:slug';

test(`${currentTest} should return all found logs in connection`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    /* eslint-disable */
    const created_at = new Date();
    const updated_at = new Date();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({
        [testData.firstTableInfo.testTableColumnName]: randomName,
        [testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(addRowInTable.status, 201);

    const getTableLogs = await request(app.getHttpServer())
      .get(`/logs/${testData.connections.firstId}`)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getRowInTableRO = JSON.parse(getTableLogs.text);

    t.is(getRowInTableRO.logs.length, 1);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('table_name'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('received_data'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('old_data'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('cognitoUserName'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('email'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('operationType'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('operationStatusResult'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('createdAt'), true);
    t.is(getRowInTableRO.logs[0].hasOwnProperty('connection_id'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

//****************************** TABLE SETTINGS CONTROLLER

currentTest = 'GET /settings/';

test(`${currentTest} should return empty table settings when it was not created`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getTableSettings = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${testData.connections.firstId}&tableName=users`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableSettingsRO = JSON.parse(getTableSettings.text);
    t.is(getTableSettings.status, 200);
    t.is(JSON.stringify(getTableSettingsRO), JSON.stringify({}));
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return table settings when it was created`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.firstTableInfo.testTableName,
      ['id'],
      [testData.firstTableInfo.testTableSecondColumnName],
      [testData.firstTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createTableSettingsResponse.status, 201);

    const getTableSettings = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableSettingsRO = JSON.parse(getTableSettings.text);
    t.is(getTableSettings.status, 200);
    t.is(getTableSettingsRO.hasOwnProperty('id'), true);
    t.is(getTableSettingsRO.table_name, createTableSettingsDTO.table_name);
    t.is(getTableSettingsRO.display_name, createTableSettingsDTO.display_name);
    t.is(JSON.stringify(getTableSettingsRO.search_fields), JSON.stringify(createTableSettingsDTO.search_fields));
    t.is(JSON.stringify(getTableSettingsRO.excluded_fields), JSON.stringify(createTableSettingsDTO.excluded_fields));
    t.is(JSON.stringify(getTableSettingsRO.list_fields), JSON.stringify(createTableSettingsDTO.list_fields));
    t.is(JSON.stringify(getTableSettingsRO.identification_fields), JSON.stringify([]));
    t.is(getTableSettingsRO.list_per_page, createTableSettingsDTO.list_per_page);
    t.is(getTableSettingsRO.ordering, createTableSettingsDTO.ordering);
    t.is(getTableSettingsRO.ordering_field, createTableSettingsDTO.ordering_field);
    t.is(JSON.stringify(getTableSettingsRO.readonly_fields), JSON.stringify(createTableSettingsDTO.readonly_fields));
    t.is(JSON.stringify(getTableSettingsRO.sortable_by), JSON.stringify(createTableSettingsDTO.sortable_by));
    t.is(JSON.stringify(getTableSettingsRO.autocomplete_columns), JSON.stringify([]));
    t.is(getTableSettingsRO.connection_id, testData.connections.firstId);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when you try get settings in connection where you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.firstTableInfo.testTableName,
      ['id'],
      [testData.firstTableInfo.testTableSecondColumnName],
      [testData.firstTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableSettings = await request(app.getHttpServer())
      .get(
        `/settings/?connectionId=${testData.connections.secondId}&tableName=${testData.firstTableInfo.testTableName}`,
      )
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableSettingsRO = JSON.parse(getTableSettings.text);
    t.is(getTableSettings.status, 403);
    t.is(getTableSettingsRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'POST /settings/';

test(`${currentTest} should return created table settings`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.firstTableInfo.testTableName,
      ['id'],
      [testData.firstTableInfo.testTableSecondColumnName],
      [testData.firstTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.hasOwnProperty('id'), true);
    t.is(createTableSettingsRO.table_name, createTableSettingsDTO.table_name);
    t.is(createTableSettingsRO.display_name, createTableSettingsDTO.display_name);
    t.is(JSON.stringify(createTableSettingsRO.search_fields), JSON.stringify(createTableSettingsDTO.search_fields));
    t.is(JSON.stringify(createTableSettingsRO.excluded_fields), JSON.stringify(createTableSettingsDTO.excluded_fields));
    t.is(JSON.stringify(createTableSettingsRO.list_fields), JSON.stringify(createTableSettingsDTO.list_fields));
    t.is(JSON.stringify(createTableSettingsRO.identification_fields), JSON.stringify([]));
    t.is(createTableSettingsRO.list_per_page, createTableSettingsDTO.list_per_page);
    t.is(createTableSettingsRO.ordering, createTableSettingsDTO.ordering);
    t.is(createTableSettingsRO.ordering_field, createTableSettingsDTO.ordering_field);
    t.is(JSON.stringify(createTableSettingsRO.readonly_fields), JSON.stringify(createTableSettingsDTO.readonly_fields));
    t.is(JSON.stringify(createTableSettingsRO.sortable_by), JSON.stringify(createTableSettingsDTO.sortable_by));
    t.is(JSON.stringify(createTableSettingsRO.autocomplete_columns), JSON.stringify([]));
    t.is(createTableSettingsRO.connection_id, testData.connections.firstId);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when you try create settings in connection where you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.firstTableInfo.testTableName,
      ['id'],
      [testData.firstTableInfo.testTableSecondColumnName],
      [testData.firstTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(
        `/settings?connectionId=${testData.connections.secondId}&tableName=${testData.firstTableInfo.testTableName}`,
      )
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 403);

    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT /settings/';

test(`${currentTest} should return updated table settings`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.firstTableInfo.testTableName,
      ['id'],
      [testData.firstTableInfo.testTableSecondColumnName],
      [testData.firstTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const updateTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.firstTableInfo.testTableName,
      ['id'],
      [testData.firstTableInfo.testTableSecondColumnName],
      [testData.firstTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.ASC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const updateTableSettingsResponse = await request(app.getHttpServer())
      .put(`/settings?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .send(updateTableSettingsDTO)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const updateTableSettingsRO = JSON.parse(updateTableSettingsResponse.text);
    t.is(updateTableSettingsResponse.status, 200);

    t.is(updateTableSettingsRO.hasOwnProperty('id'), true);
    t.is(updateTableSettingsRO.table_name, updateTableSettingsDTO.table_name);
    t.is(updateTableSettingsRO.display_name, updateTableSettingsDTO.display_name);
    t.is(JSON.stringify(updateTableSettingsRO.search_fields), JSON.stringify(updateTableSettingsDTO.search_fields));
    t.is(JSON.stringify(updateTableSettingsRO.excluded_fields), JSON.stringify(updateTableSettingsDTO.excluded_fields));
    t.is(JSON.stringify(updateTableSettingsRO.list_fields), JSON.stringify(updateTableSettingsDTO.list_fields));
    //   t.is(JSON.stringify(updateTableSettingsRO.identification_fields)).toBe(JSON.stringify([]));
    t.is(updateTableSettingsRO.list_per_page, updateTableSettingsDTO.list_per_page);
    t.is(updateTableSettingsRO.ordering, updateTableSettingsDTO.ordering);
    t.is(updateTableSettingsRO.ordering_field, updateTableSettingsDTO.ordering_field);
    t.is(JSON.stringify(updateTableSettingsRO.readonly_fields), JSON.stringify(updateTableSettingsDTO.readonly_fields));
    t.is(JSON.stringify(updateTableSettingsRO.sortable_by), JSON.stringify(updateTableSettingsDTO.sortable_by));
    // t.is(JSON.stringify(updateTableSettingsRO.autocomplete_columns)).toBe(JSON.stringify([]));
    t.is(updateTableSettingsRO.connection_id, testData.connections.firstId);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when you try update settings in connection where you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.secondId,
      testData.secondTableInfo.testTableName,
      ['id'],
      [testData.secondTableInfo.testTableSecondColumnName],
      [testData.secondTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(
        `/settings?connectionId=${testData.connections.secondId}&tableName=${testData.secondTableInfo.testTableName}`,
      )
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createTableSettingsResponse.status, 201);

    const updateTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.secondTableInfo.testTableName,
      ['id'],
      [testData.secondTableInfo.testTableSecondColumnName],
      [testData.secondTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.ASC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const updateTableSettingsResponse = await request(app.getHttpServer())
      .put(
        `/settings?connectionId=${testData.connections.secondId}&tableName=${testData.secondTableInfo.testTableName}`,
      )
      .send(updateTableSettingsDTO)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(updateTableSettingsResponse.status, 403);
    t.is(JSON.parse(updateTableSettingsResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'DELETE /settings/';

test(`${currentTest} should return array without deleted table settings`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.firstId,
      testData.firstTableInfo.testTableName,
      ['id'],
      [testData.firstTableInfo.testTableSecondColumnName],
      [testData.firstTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const deleteTableSettingsResponse = await request(app.getHttpServer())
      .delete(
        `/settings/?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`,
      )
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(deleteTableSettingsResponse.status, 200);

    const getTableSettings = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${testData.connections.firstId}&tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableSettingsRO = JSON.parse(getTableSettings.text);
    t.is(getTableSettings.status, 200);
    t.is(JSON.stringify(getTableSettingsRO), JSON.stringify({}));
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception when you try delete settings in connection where you do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      testData.connections.secondId,
      testData.secondTableInfo.testTableName,
      ['id'],
      [testData.secondTableInfo.testTableSecondColumnName],
      [testData.secondTableInfo.testTableColumnName],
      3,
      QueryOrderingEnum.DESC,
      'id',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(
        `/settings?connectionId=${testData.connections.secondId}&tableName=${testData.secondTableInfo.testTableName}`,
      )
      .send(createTableSettingsDTO)
      .set('Cookie', testData.users.adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createTableSettingsResponse.status, 201);

    const deleteTableSettingsResponse = await request(app.getHttpServer())
      .delete(
        `/settings/?connectionId=${testData.connections.secondId}&tableName=${testData.secondTableInfo.testTableName}`,
      )
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteTableSettingsRO = JSON.parse(deleteTableSettingsResponse.text);
    t.is(deleteTableSettingsResponse.status, 403);
    t.is(deleteTableSettingsRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

//****************************** TABLE WIDGETS CONTROLLER

currentTest = 'GET /widgets/:slug';

test(`${currentTest} should return empty widgets array when widgets not created`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const getTableWidgets = await request(app.getHttpServer())
      .get(`/widgets/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', testData.users.simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
    t.is(getTableWidgets.status, 200);
    t.is(typeof getTableWidgetsRO, 'object');
    t.is(getTableWidgetsRO.length, 0);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should return array of table widgets for table`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);

    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      undefined,
      testData.firstTableInfo.testTableSecondColumnName,
    );

    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 201);

    t.is(typeof createTableWidgetRO, 'object');
    t.is(createTableWidgetRO.length, 2);
    t.is(createTableWidgetRO[0].widget_type, newTableWidgets[0].widget_type);
    t.is(createTableWidgetRO[1].field_name, newTableWidgets[1].field_name);
    t.is(createTableWidgetRO[0].name, newTableWidgets[0].name);
    t.is(uuidRegex.test(createTableWidgetRO[1].id), true);

    const getTableWidgets = await request(app.getHttpServer())
      .get(`/widgets/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    t.is(getTableWidgets.status, 200);
    const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
    t.is(typeof getTableWidgetsRO, 'object');
    t.is(getTableWidgetsRO.length, 2);
    t.is(uuidRegex.test(getTableWidgetsRO[0].id), true);
    t.is(getTableWidgetsRO[0].field_name, newTableWidgets[0].field_name);
    t.is(getTableWidgetsRO[0].widget_type, newTableWidgets[0].widget_type);

    t.is(compareTableWidgetsArrays(getTableWidgetsRO, newTableWidgets), true);

    const getTableStructureResponse = await request(app.getHttpServer())
      .get(`/table/structure/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    t.is(getTableStructureResponse.status, 200);
    const getTableStructureRO = JSON.parse(getTableStructureResponse.text);
    t.is(getTableStructureRO.hasOwnProperty('table_widgets'), true);
    t.is(getTableStructureRO.table_widgets.length, 2);
    t.is(getTableStructureRO.table_widgets[0].field_name, newTableWidgets[0].field_name);
    t.is(getTableStructureRO.table_widgets[1].widget_type, newTableWidgets[1].widget_type);
    t.is(compareTableWidgetsArrays(getTableStructureRO.table_widgets, newTableWidgets), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when you try to get widgets from connection, when you do not have permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      undefined,
      testData.secondTableInfo.testTableSecondColumnName,
    );
    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${testData.connections.secondId}?tableName=${testData.secondTableInfo.testTableName}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.adminUserToken)
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 201);
    t.is(typeof createTableWidgetRO, 'object');
    t.is(createTableWidgetRO.length, 2);
    t.is(createTableWidgetRO[0].widget_type, newTableWidgets[0].widget_type);
    t.is(createTableWidgetRO[1].field_name, newTableWidgets[1].field_name);
    t.is(createTableWidgetRO[0].name, newTableWidgets[0].name);
    t.is(uuidRegex.test(createTableWidgetRO[0].id), true);

    const getTableWidgets = await request(app.getHttpServer())
      .get(`/widgets/${testData.connections.secondId}?tableName=${testData.secondTableInfo.testTableName}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
    t.is(getTableWidgets.status, 403);
    t.is(getTableWidgetsRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'POST /widget/:slug';

test(`${currentTest} should return table settings with created table widget field`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      undefined,
      testData.firstTableInfo.testTableSecondColumnName,
    );
    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 201);
    t.is(typeof createTableWidgetRO, 'object');

    const getTableWidgets = await request(app.getHttpServer())
      .get(`/widgets/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    t.is(getTableWidgets.status, 200);
    const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
    t.is(typeof getTableWidgetsRO, 'object');
    t.is(getTableWidgetsRO.length, 2);
    t.is(uuidRegex.test(getTableWidgetsRO[0].id), true);
    t.is(getTableWidgetsRO[0].widget_type, newTableWidgets[0].widget_type);
    t.is(compareTableWidgetsArrays(getTableWidgetsRO, newTableWidgets), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test(`${currentTest} should throw an exception, when you try add widget in connection, when you do not have permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      undefined,
      testData.firstTableInfo.testTableSecondColumnName,
    );
    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${testData.connections.secondId}?tableName=${testData.firstTableInfo.testTableName}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', testData.users.simpleUserToken)
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 403);
    t.is(createTableWidgetRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (error) {
    console.error(error);
    throw error;
  }
});
