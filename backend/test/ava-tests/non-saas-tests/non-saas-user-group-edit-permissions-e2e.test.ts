/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../../utils/user-with-different-permissions-utils.js';
import { inviteUserInCompanyAndAcceptInvitation } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { ErrorsMessages } from '../../../src/exceptions/custom-exceptions/messages/custom-errors-messages.js';

let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const mockFactory = new MockFactory();
const newConnectionToPostgres = mockFactory.generateConnectionToTestPostgresDBInDocker();
const updateConnection = mockFactory.generateUpdateConnectionDto();
const newGroup1 = mockFactory.generateCreateGroupDto1();
const tablePermissions = {
  visibility: true,
  readonly: false,
  add: true,
  delete: true,
  edit: false,
};

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
    console.error('user group edit permissions e2e tests ' + e);
  }
});

//***************************************** USER NOT ADDED INTO ADMIN GROUP

//****************************** CONNECTION CONTROLLER

currentTest = 'GET /connections/';

test(`${currentTest} should return connections, where second user have access`, async (t) => {
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
    const findAll = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    t.is(findAll.status, 200);

    const result = findAll.body.connections;
    t.is(result.length, 1);
    t.is(result[0].hasOwnProperty('connection'), true);
    t.is(result[0].hasOwnProperty('accessLevel'), true);
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
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /connection/one/:slug';

test(`${currentTest} should return a found connection`, async (t) => {
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

    const searchedConnectionId = connections.firstId;
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${searchedConnectionId}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
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
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you do not have permission in this connection`, async (t) => {
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

    const searchedConnectionId = connections.secondId;

    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${searchedConnectionId}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    // todo add checking connection object properties
    t.is(findOneResponce.status, 200);
    const findOneRO = JSON.parse(findOneResponce.text);
    t.is(findOneRO.hasOwnProperty('host'), false);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /connection';

test(`${currentTest} should throw exception you do not have permission`, async (t) => {
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

    const updateConnectionResponse = await request(app.getHttpServer())
      .put(`/connection/${connections.firstId}`)
      .send(updateConnection)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateConnectionResponse.status, 403);
    t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should return throw an exception, when you try update a connection without permissions in it`, async (t) => {
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
    const updateConnectionResponse = await request(app.getHttpServer())
      .put(`/connection/${connections.secondId}`)
      .send(updateConnection)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateConnectionResponse.status, 403);
    t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'DELETE /connection/:slug';

test(`${currentTest} should throw an exception do not have permissions`, async (t) => {
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

    const response = await request(app.getHttpServer())
      .put(`/connection/delete/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);

    //deleted connection found in database
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findOneResponce.status, 200);
    t.is(JSON.parse(findOneResponce.text).connection.id, connections.firstId);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you try to delete connection without permission`, async (t) => {
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

    const response = await request(app.getHttpServer())
      .put(`/connection/delete/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);

    //connection wasn't deleted
    const findOneResponce = await request(app.getHttpServer())
      .get(`/connection/one/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findOneResponce.status, 200);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'POST /connection/group/:slug';

test(`${currentTest} should throw an exception don not have permission`, async (t) => {
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

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 403);
    t.is(JSON.parse(createGroupResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when you try add group in connection without permission in it`, async (t) => {
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
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 403);
    t.is(JSON.parse(createGroupResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /connection/group/:slug';

test(`${currentTest} should return connection without deleted group result`, async (t) => {
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

    const newGroup1 = MockFactory.generateCreateGroupDtoWithRandomTitle();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.firstId}`)
      .set('Cookie', adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // create group in connection
    let result = createGroupResponse.body;
    t.is(createGroupResponse.status, 201);

    t.is(result.hasOwnProperty('id'), true);
    t.is(result.title, newGroup1.title);

    const createGroupRO = JSON.parse(createGroupResponse.text);

    const response = await request(app.getHttpServer())
      .put(`/connection/group/delete/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .send({ groupId: createGroupRO.id })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    //after deleting group
    result = response.body;

    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you try delete group in connection without permissions`, async (t) => {
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
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.secondId}`)
      .set('Cookie', adminUserToken)
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
      .put(`/connection/group/delete/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .send({ groupId: createGroupRO.id })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 403);
    t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /connection/groups/:slug';

test(`${currentTest} should groups in connection`, async (t) => {
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

    const newRandomGroup2 = MockFactory.generateCreateGroupDtoWithRandomTitle();

    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.firstId}`)
      .set('Cookie', adminUserToken)
      .send(newRandomGroup2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 201);

    const response = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    const result = JSON.parse(response.text);
    const groupId = result[0].group.id;
    t.is(uuidRegex.test(groupId), true);
    t.is(result[0].group.hasOwnProperty('title'), true);
    t.is(result[0].accessLevel, AccessLevelEnum.edit);

    const index = result.findIndex((el: any) => {
      return el.group.title === 'Admin';
    });

    t.is(index >= 0, false);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} it should throw an exception, when you try get groups in connection, where you do not have permission`, async (t) => {
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
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.secondId}`)
      .set('Cookie', adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createGroupResponse.status, 201);

    const response = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.secondId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 200);

    const result = JSON.parse(response.text);
    t.is(result.length, 0);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /connection/permissions';

test(`${currentTest} should return permissions object for current group in current connection`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);
    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/connection/permissions?connectionId=${connections.firstId}&groupId=${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const result = JSON.parse(response.text);
    t.is(response.status, 200);

    t.is(result.hasOwnProperty('connection'), true);
    t.is(result.hasOwnProperty('group'), true);
    t.is(result.hasOwnProperty('tables'), true);
    t.is(typeof result.connection, 'object');
    t.is(typeof result.group, 'object');
    t.is(result.connection.connectionId, connections.firstId);
    t.is(result.group.groupId, groupId);
    t.is(result.connection.accessLevel, AccessLevelEnum.readonly);
    t.is(result.group.accessLevel, AccessLevelEnum.edit);
    t.is(typeof result.tables, 'object');

    const { tables } = result;
    const tableIndex = tables.findIndex((table: any) => table.tableName === firstTableInfo.testTableName);
    t.is(tables.length > 0, true);
    t.is(typeof tables[tableIndex], 'object');
    t.is(tables[tableIndex].hasOwnProperty('accessLevel'), true);
    t.is(tables[tableIndex].accessLevel.visibility, tablePermissions.visibility);
    t.is(tables[tableIndex].accessLevel.readonly, tablePermissions.readonly);
    t.is(tables[tableIndex].accessLevel.add, tablePermissions.add);
    t.is(tables[tableIndex].accessLevel.delete, tablePermissions.delete);
    t.is(tables[tableIndex].accessLevel.edit, tablePermissions.edit);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /connection/user/permissions';

test(`${currentTest} should return permissions object for current group in current connection`, async (t) => {
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

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);
    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/connection/user/permissions?connectionId=${connections.firstId}&groupId=${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(response.status, 200);
    const result = JSON.parse(response.text);

    t.is(result.hasOwnProperty('connection'), true);
    t.is(result.hasOwnProperty('group'), true);
    t.is(result.hasOwnProperty('tables'), true);
    t.is(typeof result.connection, 'object');
    t.is(typeof result.group, 'object');
    t.is(result.connection.connectionId, connections.firstId);
    t.is(result.group.groupId, groupId);
    t.is(result.connection.accessLevel, AccessLevelEnum.readonly);
    t.is(result.group.accessLevel, AccessLevelEnum.edit);
    t.is(typeof result.tables, 'object');

    const { tables } = result;
    const foundTableIndex = tables.findIndex((table) => table.tableName === firstTableInfo.testTableName);
    t.is(tables.length > 0, true);
    t.is(typeof tables[foundTableIndex], 'object');
    t.is(tables[foundTableIndex].hasOwnProperty('accessLevel'), true);
    t.is(tables[foundTableIndex].accessLevel.visibility, tablePermissions.visibility);
    t.is(tables[foundTableIndex].accessLevel.readonly, tablePermissions.readonly);
    t.is(tables[foundTableIndex].accessLevel.add, tablePermissions.add);
    t.is(tables[foundTableIndex].accessLevel.delete, tablePermissions.delete);
    t.is(tables[foundTableIndex].accessLevel.edit, tablePermissions.edit);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should return permissions object for current group in current connection for current user`, async (t) => {
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

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.secondId}`)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/connection/user/permissions?connectionId=${connections.secondId}&groupId=${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(response.status, 200);
    const result = JSON.parse(response.text);

    t.is(result.hasOwnProperty('connection'), true);
    t.is(result.hasOwnProperty('group'), true);
    t.is(result.hasOwnProperty('tables'), true);
    t.is(typeof result.connection, 'object');
    t.is(typeof result.group, 'object');
    t.is(result.connection.connectionId, connections.secondId);
    t.is(result.group.groupId, groupId);
    t.is(result.connection.accessLevel, AccessLevelEnum.none);
    t.is(result.group.accessLevel, AccessLevelEnum.none);
    t.is(typeof result.tables, 'object');

    const { tables } = result;
    const foundTableIndex = tables.findIndex((table) => table.tableName === firstTableInfo.testTableName);
    t.is(tables.length > 0, true);
    t.is(typeof tables[0], 'object');
    t.is(tables[foundTableIndex].hasOwnProperty('accessLevel'), true);
    t.is(tables[foundTableIndex].accessLevel.visibility, false);
    t.is(tables[foundTableIndex].accessLevel.readonly, false);
    t.is(tables[foundTableIndex].accessLevel.add, false);
    t.is(tables[foundTableIndex].accessLevel.delete, false);
    t.is(tables[foundTableIndex].accessLevel.edit, false);
    t.is(tables[foundTableIndex].accessLevel.edit, false);
  } catch (e) {
    console.error(e);
  }
});

//****************************** GROUP CONTROLLER ******************************//

currentTest = 'GET /groups/';

test(`${currentTest} should return found groups with current user`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      users: { simpleUserToken },
    } = testData;

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/groups/`)
      .set('Cookie', simpleUserToken)
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
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /group/users/:slug';
test(`${currentTest} it should return users in group`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);
    const nonAdminGroupIndex = getGroupsRO.findIndex((element) => {
      return !element.group.isMain;
    });
    const groupId = getGroupsRO[nonAdminGroupIndex].group.id;
    const response = await request(app.getHttpServer())
      .get(`/group/users/${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getUsersRO = JSON.parse(response.text);
    t.is(getUsersRO.length, 2);
    t.is(getUsersRO[0].id === getUsersRO[1].id, false);
    t.is(getUsersRO[0].hasOwnProperty('createdAt'), true);
    t.is(getUsersRO[0].hasOwnProperty('password'), false);
    t.is(getUsersRO[0].hasOwnProperty('isActive'), true);
    t.is(getUsersRO[0].hasOwnProperty('email'), true);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} it should throw an exception when you try to receive user in group where you dont have permission`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.secondId}`)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const response = await request(app.getHttpServer())
      .get(`/group/users/${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getUsersRO = JSON.parse(response.text);
    t.is(getUsersRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /group/user';

test(`${currentTest} should return group with added user`, async (t) => {
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

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const email = faker.internet.email();
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', simpleUserToken)
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
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw exception, when user email not passed in request`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', simpleUserToken)
      .send({ groupId })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
    t.is(addUserInGroupResponse.status, 400);
    // t.is(addUserInGroupRO.message, ErrorsMessages.VALIDATION_FAILED);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw exception, when group id not passed in request`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;
    const email = faker.internet.email();
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', simpleUserToken)
      .send({ email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
    t.is(addUserInGroupResponse.status, 400);
    t.is(addUserInGroupRO.message, Messages.GROUP_ID_MISSING);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw exception, when group id passed in request is incorrect`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const email = faker.internet.email();
    const groupId = faker.string.uuid();
    const addUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user')
      .set('Cookie', simpleUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addUserInGroupRO = JSON.parse(addUserInGroupResponse.text);
    t.is(addUserInGroupResponse.status, 400);
    t.is(addUserInGroupRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'DELETE /group/:slug';

test(`${currentTest} should delete result after group deletion`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);

    const groupId = JSON.parse(getGroupsResponse.text)[0].group.id;
    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
    t.is(deleteGroupRO.isMain, false);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when you try delete admin group`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const adminGroupIndex = getGroupsRO.findIndex((group) => group.group.isMain);

    const groupId = getGroupsRO[adminGroupIndex].group.id;
    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
    t.is(deleteGroupRO.message, Messages.CANT_DELETE_ADMIN_GROUP);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when group id not passed in request`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;
    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(deleteGroupResponse.status, 404);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when group id passed in request is incorrect`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);

    const groupId = faker.string.uuid();
    const deleteGroupResponse = await request(app.getHttpServer())
      .delete(`/group/${groupId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteGroupRO = JSON.parse(deleteGroupResponse.text);
    t.is(deleteGroupRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /group/user/delete';

test(`${currentTest} should return group without deleted user`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(adminUserToken, undefined, app, undefined);

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
      .set('Cookie', simpleUserToken)
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
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw exception, when user email not passed in request`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(adminUserToken, undefined, app, undefined);

    const email = thirdTestUser.email;

    const deleteUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user/delete')
      .set('Cookie', simpleUserToken)
      .send({ groupId })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
    // t.is(deleteUserInGroupRO.message, ErrorsMessages.VALIDATION_FAILED);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw exception, when group id not passed in request`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(adminUserToken, undefined, app, undefined);

    const email = thirdTestUser.email;

    const deleteUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user/delete')
      .set('Cookie', simpleUserToken)
      .send({ email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
    t.is(deleteUserInGroupRO.message, Messages.GROUP_ID_MISSING);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw exception, when group id passed in request is incorrect`, async (t) => {
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
    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    let groupId = getGroupsRO[0].group.id;

    const thirdTestUser = await inviteUserInCompanyAndAcceptInvitation(adminUserToken, undefined, app, undefined);

    const email = thirdTestUser.email;

    groupId = faker.string.uuid();
    const deleteUserInGroupResponse = await request(app.getHttpServer())
      .put('/group/user/delete')
      .set('Cookie', simpleUserToken)
      .send({ groupId, email })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteUserInGroupRO = JSON.parse(deleteUserInGroupResponse.text);
    t.is(deleteUserInGroupRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

//****************************** PERMISSION CONTROLLER TESTS ******************************//

currentTest = 'PUT permissions/:slug';

test(`${currentTest} should throw an exception do not have permission`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;
    const newGroup1 = MockFactory.generateCreateGroupDtoWithRandomTitle();
    const createGroupResponse = await request(app.getHttpServer())
      .post(`/connection/group/${connections.firstId}`)
      .set('Cookie', adminUserToken)
      .send(newGroup1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createGroupRO = JSON.parse(createGroupResponse.text);
    t.is(createGroupResponse.status, 201);
    const newGroupId = createGroupRO.id;

    const permissions = {
      connection: {
        connectionId: connections.firstId,
        accessLevel: AccessLevelEnum.readonly,
      },
      group: {
        groupId: newGroupId,
        accessLevel: AccessLevelEnum.readonly,
      },
      tables: [
        {
          tableName: firstTableInfo.testTableName,
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
      .put(`/permissions/${newGroupId}`)
      .send({ permissions })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
    t.is(createOrUpdatePermissionResponse.status, 403);
    t.is(createOrUpdatePermissionRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should return updated complex permissions object when you update permissions`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const getGroupsResponse = await request(app.getHttpServer())
      .get(`/connection/groups/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getGroupsResponse.status, 200);
    const getGroupsRO = JSON.parse(getGroupsResponse.text);

    const groupId = getGroupsRO[0].group.id;

    const permissions = {
      connection: {
        accessLevel: AccessLevelEnum.none,
        connectionId: connections.firstId,
      },
      group: {
        accessLevel: AccessLevelEnum.readonly,
        groupId: groupId,
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
          tableName: firstTableInfo.testTableName,
        },
      ],
    };

    const createOrUpdatePermissionResponse = await request(app.getHttpServer())
      .put(`/permissions/${groupId}`)
      .send({ permissions })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
    t.is(createOrUpdatePermissionResponse.status, 200);
    t.is(JSON.stringify(createOrUpdatePermissionRO.connection), JSON.stringify(permissions.connection));
    t.is(JSON.stringify(createOrUpdatePermissionRO.group), JSON.stringify(permissions.group));
    t.is(JSON.stringify(createOrUpdatePermissionRO.tables), JSON.stringify(permissions.tables));
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you try change admin group`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups: { firstAdminGroupId },
      secondTableInfo,
      users: { adminUserToken, simpleUserToken },
    } = testData;

    const permissions = {
      connection: {
        connectionId: connections.firstId,
        accessLevel: AccessLevelEnum.edit,
      },
      group: {
        groupId: firstAdminGroupId,
        accessLevel: AccessLevelEnum.none,
      },
      tables: [
        {
          tableName: firstTableInfo.testTableName,
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
      .put(`/permissions/${firstAdminGroupId}`)
      .send({ permissions })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createOrUpdatePermissionRO = JSON.parse(createOrUpdatePermissionResponse.text);
    t.is(createOrUpdatePermissionResponse.status, 403);
    t.is(createOrUpdatePermissionRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

//****************************** TABLE CONTROLLER TESTS ******************************//

currentTest = 'GET /connection/tables/:slug';

test(`${currentTest} should return all tables in connection`, async (t) => {
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
    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 200);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    t.is(getTablesInConnectionRO.length > 0, true);
    const tableIndex = getTablesInConnectionRO.findIndex(
      (table: any) => table.tableName === testData.firstTableInfo.testTableName,
    );
    t.is(getTablesInConnectionRO[tableIndex].table, testData.firstTableInfo.testTableName);
    t.is(typeof getTablesInConnectionRO[tableIndex].permissions, 'object');
    const { visibility, readonly, add, delete: del, edit } = getTablesInConnectionRO[0].permissions;
    t.is(visibility, tablePermissions.visibility);
    t.is(readonly, tablePermissions.readonly);
    t.is(del, tablePermissions.delete);
    t.is(edit, tablePermissions.edit);
    t.is(add, tablePermissions.add);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when connection id not passed in request`, async (t) => {
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
    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 404);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when connection id passed in request is incorrect`, async (t) => {
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
    const fakeConnectionId = faker.string.uuid();
    const getTablesInConnection = await request(app.getHttpServer())
      .get(`/connection/tables/${fakeConnectionId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesInConnection.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
    t.is(getTablesInConnectionRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /table/rows/:slug';

test(`${currentTest} should return found rows from table`, async (t) => {
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
    const getTableRows = await request(app.getHttpServer())
      .get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRows.status, 200);
    const getTableRowsRO = JSON.parse(getTableRows.text);
    const { rows, primaryColumns, pagination, sortable_by, structure, foreignKeys } = getTableRowsRO;
    t.is(rows.length, Constants.DEFAULT_PAGINATION.perPage);
    t.is(primaryColumns.length, 1);
    t.is(primaryColumns[0].column_name, 'id');
    t.is(primaryColumns[0].data_type, 'integer');
    t.is(sortable_by.length, 0);
    t.is(structure.length, 5);
    t.is(foreignKeys.length, 0);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
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
    const getTablesRows = await request(app.getHttpServer())
      .get(`/table/rows/?tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesRows.status, 404);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrec`, async (t) => {
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
    const fakeId = faker.string.uuid();
    const getTableRows = await request(app.getHttpServer())
      .get(`/table/rows/${fakeId}?tableName=${testData.firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRows.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTableRows.text);
    t.is(getTablesInConnectionRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
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
    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const getTablesRows = await request(app.getHttpServer())
      .get(`/table/rows/${connections.firstId}?tableName=${fakeTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesRows.status, 400);
    const getTablesInConnectionRO = JSON.parse(getTablesRows.text);
    t.is(getTablesInConnectionRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /table/structure/:slug';

test(`${currentTest} should return table structure`, async (t) => {
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
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getTableStructureRO = JSON.parse(getTablesStructure.text);

    t.is(getTablesStructure.status, 200);
    const { structure, primaryColumns, foreignKeys, readonly_fields, table_widgets } = getTableStructureRO;
    t.is(structure.length, 5);
    t.is(primaryColumns.length, 1);
    t.is(primaryColumns[0].column_name, 'id');
    t.is(primaryColumns[0].data_type, 'integer');
    t.is(readonly_fields.length, 0);
    t.is(table_widgets.length, 0);
    t.is(foreignKeys.length, 0);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id not passed in request`, async (t) => {
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

    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/?tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 404);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
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

    const fakeConnectionId = faker.string.uuid();
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when table name not passed in request`, async (t) => {
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
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${connections.firstId}?tableName=`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.TABLE_NAME_MISSING);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
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
    const fakeTableName = `${faker.lorem.words(1)}_${faker.datatype.number({ min: 1, max: 10000 })}`;
    const getTablesStructure = await request(app.getHttpServer())
      .get(`/table/structure/${connections.firstId}?tableName=${fakeTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTablesStructure.status, 400);
    const getTablesStructureRO = JSON.parse(getTablesStructure.text);
    t.is(getTablesStructureRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'POST /table/row/:slug';

test(`${currentTest} should return added row`, async (t) => {
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

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();

    const created_at = new Date();
    const updated_at = new Date();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .send({
        [firstTableInfo.testTableColumnName]: randomName,
        [firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTable.status, 201);
    t.is(addRowInTableRO.row.hasOwnProperty('id'), true);
    t.is(addRowInTableRO.row[firstTableInfo.testTableColumnName], randomName);
    t.is(addRowInTableRO.row[firstTableInfo.testTableSecondColumnName], randomEmail);
    t.is(addRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(addRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(addRowInTableRO.hasOwnProperty('structure'), true);
    t.is(addRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(addRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(addRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
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
    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    const created_at = new Date();
    const updated_at = new Date();
    const fakeConnectionId = faker.string.uuid();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}`)
      .send({
        [firstTableInfo.testTableColumnName]: randomName,
        [firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
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
    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    const created_at = new Date();
    const updated_at = new Date();
    const fakeTableName = `${faker.lorem.words(1)}_${faker.datatype.number({ min: 1, max: 10000 })}`;
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${connections.firstId}?tableName=${fakeTableName}`)
      .send({
        [firstTableInfo.testTableColumnName]: randomName,
        [firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /table/row/:slug';

test(`${currentTest} should throw an exception do not have permission, when you do not have edit permission`, async (t) => {
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

    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    const created_at = new Date();
    const updated_at = new Date();
    const updateRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
      .send({
        name: randomName,
        email: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(updateRowInTable.text);
    t.is(updateRowInTable.status, 403);
    t.is(addRowInTableRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
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
    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    const created_at = new Date();
    const updated_at = new Date();
    const fakeConnectionId = faker.string.uuid();
    const addRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}&id=1`)
      .send({
        name: randomName,
        email: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
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
    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    const created_at = new Date();
    const updated_at = new Date();
    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const addRowInTable = await request(app.getHttpServer())
      .put(`/table/row/${connections.firstId}?tableName=${fakeTableName}&id=1`)
      .send({
        name: randomName,
        email: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'DELETE /table/row/:slug';

test(`${currentTest} should return delete result`, async (t) => {
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
    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=19`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(deleteRowInTable.status, 200);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
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
    const fakeConnectionId = faker.string.uuid();
    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}&id=1`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteRowInTableRO = JSON.parse(deleteRowInTable.text);
    t.is(deleteRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
    t.is(deleteRowInTable.status, 400);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
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
    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const deleteRowInTable = await request(app.getHttpServer())
      .delete(`/table/row/${connections.firstId}?tableName=${fakeTableName}&id=1`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteRowInTabbleRO = JSON.parse(deleteRowInTable.text);
    t.is(deleteRowInTabbleRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'GET /table/row/:slug';

test(`${currentTest} should return row`, async (t) => {
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
    const getRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=7`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getRowInTableRO = JSON.parse(getRowInTable.text);
    t.is(getRowInTable.status, 200);
    t.is(getRowInTableRO.row.id, 7);
    t.is(getRowInTableRO.row.hasOwnProperty('created_at'), true);
    t.is(getRowInTableRO.row.hasOwnProperty('updated_at'), true);
    t.is(getRowInTableRO.hasOwnProperty('structure'), true);
    t.is(getRowInTableRO.hasOwnProperty('foreignKeys'), true);
    t.is(getRowInTableRO.hasOwnProperty('primaryColumns'), true);
    t.is(getRowInTableRO.hasOwnProperty('readonly_fields'), true);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when connection id passed in request is incorrect`, async (t) => {
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
    const fakeConnectionId = faker.string.uuid();
    const addRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}&id=5`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.CONNECTION_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when table name passed in request is incorrect`, async (t) => {
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
    const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
    const addRowInTable = await request(app.getHttpServer())
      .get(`/table/row/${connections.firstId}?tableName=${fakeTableName}&id=5`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const addRowInTableRO = JSON.parse(addRowInTable.text);
    t.is(addRowInTableRO.message, Messages.TABLE_NOT_FOUND);
  } catch (e) {
    console.error(e);
  }
});

//****************************** TABLE LOGS CONTROLLER TESTS ******************************//

currentTest = 'GET /logs/:slug';

test(`${currentTest} should return all found logs in connection'`, async (t) => {
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
    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    const created_at = new Date();
    const updated_at = new Date();
    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .send({
        [firstTableInfo.testTableColumnName]: randomName,
        [firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(addRowInTable.status, 201);

    const getTableLogs = await request(app.getHttpServer())
      .get(`/logs/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
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
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should not return all found logs in connection, when table audit is disabled in connection'`, async (t) => {
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
    const randomName = faker.person.firstName();
    const randomEmail = faker.internet.email();
    const created_at = new Date();
    const updated_at = new Date();

    const updateConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();

    const updateConnectionResponse = await request(app.getHttpServer())
      .put(`/connection/${connections.firstId}`)
      .send(updateConnection)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(updateConnectionResponse.status, 200);

    const newConnectionProperties = mockFactory.generateConnectionPropertiesUserExcluded(null, false);

    const createConnectionPropertiesResponse = await request(app.getHttpServer())
      .post(`/connection/properties/${connections.firstId}`)
      .send(newConnectionProperties)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createConnectionPropertiesResponse.status, 201);  


    const addRowInTable = await request(app.getHttpServer())
      .post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .send({
        [firstTableInfo.testTableColumnName]: randomName,
        [firstTableInfo.testTableSecondColumnName]: randomEmail,
        created_at: created_at,
        updated_at: updated_at,
      })
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(addRowInTable.status, 201);

    const getTableLogs = await request(app.getHttpServer())
      .get(`/logs/${connections.firstId}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getRowInTableRO = JSON.parse(getTableLogs.text);

    t.is(getRowInTableRO.logs.length, 0);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

//****************************** TABLE SETTINGS CONTROLLER TESTS ******************************//

currentTest = 'GET /settings/';

test(`${currentTest} should return empty table settings when it was not created`, async (t) => {
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
    const getTableSettings = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableSettingsRO = JSON.parse(getTableSettings.text);
    t.is(getTableSettings.status, 200);
    t.is(JSON.stringify(getTableSettingsRO), JSON.stringify({}));
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} 'should return table settings when it was created`, async (t) => {
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

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.firstId,
      firstTableInfo.testTableName,
      ['id'],
      [firstTableInfo.testTableSecondColumnName],
      [firstTableInfo.testTableColumnName],
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
      .post(`/settings?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const getTableSettings = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
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
    t.is(getTableSettingsRO.connection_id, connections.firstId);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when you try get settings in connection where you do not have permission`, async (t) => {
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

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.secondId,
      secondTableInfo.testTableName,
      ['id'],
      [secondTableInfo.testTableSecondColumnName],
      [secondTableInfo.testTableColumnName],
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
      .post(`/settings?connectionId=${connections.secondId}&tableName=${secondTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(createTableSettingsResponse.status, 201);

    const getTableSettings = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${connections.secondId}&tableName=${secondTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableSettingsRO = JSON.parse(getTableSettings.text);
    t.is(getTableSettings.status, 403);
    t.is(getTableSettingsRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'POST /settings/';

test(`${currentTest} should throw an exception do not have permission`, async (t) => {
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

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.firstId,
      'users',
      ['id'],
      ['email'],
      ['name'],
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
      .post(`/settings?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}}`)
      .send(createTableSettingsDTO)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 403);
    t.is(JSON.parse(createTableSettingsResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when you try create settings in connection where you do not have permission`, async (t) => {
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

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.secondId,
      secondTableInfo.testTableName,
      ['id'],
      [secondTableInfo.testTableSecondColumnName],
      [secondTableInfo.testTableColumnName],
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
      .post(`/settings?connectionId=${connections.secondId}&tableName=${secondTableInfo.testTableName}}`)
      .send(createTableSettingsDTO)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 403);

    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'PUT /settings/';

test(`${currentTest} should throw an exception do not have permission`, async (t) => {
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
    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.firstId,
      firstTableInfo.testTableName,
      ['id'],
      [firstTableInfo.testTableSecondColumnName],
      [firstTableInfo.testTableColumnName],
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
      .post(`/settings?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const updateTableSettingsDTO = mockFactory.generateTableSettings(
      connections.firstId,
      firstTableInfo.testTableName,
      [firstTableInfo.testTableSecondColumnName],
      ['id'],
      [firstTableInfo.testTableColumnName],
      50,
      QueryOrderingEnum.ASC,
      'created_at',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const updateTableSettingsResponse = await request(app.getHttpServer())
      .put(`/settings?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}}`)
      .send(updateTableSettingsDTO)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(updateTableSettingsResponse.status, 403);
    t.is(JSON.parse(updateTableSettingsResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when you try update settings in connection where you do not have permission`, async (t) => {
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
    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.secondId,
      secondTableInfo.testTableName,
      ['id'],
      [secondTableInfo.testTableSecondColumnName],
      [secondTableInfo.testTableColumnName],
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
      .post(`/settings?connectionId=${connections.secondId}&tableName=${secondTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const updateTableSettingsDTO = mockFactory.generateTableSettings(
      connections.firstId,
      firstTableInfo.testTableName,
      [firstTableInfo.testTableSecondColumnName],
      ['id'],
      [firstTableInfo.testTableColumnName],
      50,
      QueryOrderingEnum.ASC,
      'created_at',
      ['updated_at'],
      ['created_at'],
      undefined,
      undefined,
      undefined,
    );

    const updateTableSettingsResponse = await request(app.getHttpServer())
      .put(`/settings?connectionId=${connections.secondId}&tableName=${secondTableInfo.testTableName}}}`)
      .send(updateTableSettingsDTO)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(updateTableSettingsResponse.status, 403);
    t.is(JSON.parse(updateTableSettingsResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'DELETE /settings/';

test(`${currentTest} should return array without deleted table settings`, async (t) => {
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
    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.firstId,
      firstTableInfo.testTableName,
      ['id'],
      [firstTableInfo.testTableSecondColumnName],
      [firstTableInfo.testTableColumnName],
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
      .post(`/settings?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const deleteTableSettingsResponse = await request(app.getHttpServer())
      .delete(`/settings/?connectionId=${connections.firstId}&tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(deleteTableSettingsResponse.status, 403);
    t.is(JSON.parse(deleteTableSettingsResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception when you try delete settings in connection where you do not have permission`, async (t) => {
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
    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connections.secondId,
      secondTableInfo.testTableName,
      ['id'],
      [secondTableInfo.testTableSecondColumnName],
      [secondTableInfo.testTableColumnName],
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
      .post(`/settings?connectionId=${connections.secondId}&tableName=${secondTableInfo.testTableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const deleteTableSettingsResponse = await request(app.getHttpServer())
      .delete(`/settings/?connectionId=${connections.secondId}&tableName=${secondTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const deleteTableSettingsRO = JSON.parse(deleteTableSettingsResponse.text);
    t.is(deleteTableSettingsResponse.status, 403);
    t.is(deleteTableSettingsRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

//****************************** TABLE WIDGETS CONTROLLER TESTS ******************************//

currentTest = 'GET /widgets/:slug';

test(`${currentTest} should return empty widgets array when widgets not created`, async (t) => {
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
    const getTableWidgets = await request(app.getHttpServer())
      .get(`/widgets/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
    t.is(getTableWidgets.status, 200);
    t.is(typeof getTableWidgetsRO, 'object');
    t.is(getTableWidgetsRO.length, 0);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should return array of table widgets for table`, async (t) => {
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

    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      'id',
      firstTableInfo.testTableColumnName,
    );
    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
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
      .get(`/widgets/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');
    t.is(getTableWidgets.status, 200);
    const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
    t.is(typeof getTableWidgetsRO, 'object');
    t.is(getTableWidgetsRO.length, 2);
    t.is(uuidRegex.test(getTableWidgetsRO[0].id), true);
    t.is(getTableWidgetsRO[0].field_name, newTableWidgets[0].field_name);
    t.is(getTableWidgetsRO[1].widget_type, newTableWidgets[1].widget_type);
    t.is(compareTableWidgetsArrays(getTableWidgetsRO, newTableWidgets), true);

    const getTableStructureResponse = await request(app.getHttpServer())
      .get(`/table/structure/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');
    t.is(getTableStructureResponse.status, 200);
    const getTableStructureRO = JSON.parse(getTableStructureResponse.text);
    t.is(getTableStructureRO.hasOwnProperty('table_widgets'), true);
    t.is(getTableStructureRO.table_widgets.length, 2);
    t.is(getTableStructureRO.table_widgets[0].field_name, newTableWidgets[0].field_name);
    t.is(getTableStructureRO.table_widgets[1].widget_type, newTableWidgets[1].widget_type);
    t.is(compareTableWidgetsArrays(getTableStructureRO.table_widgets, newTableWidgets), true);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you try to get widgets from connection, when you do not have permissions`, async (t) => {
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
    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      'id',
      firstTableInfo.testTableColumnName,
    );
    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 201);
    t.is(typeof createTableWidgetRO, 'object');
    t.is(createTableWidgetRO.length, 2);

    t.is(uuidRegex.test(createTableWidgetRO[0].id), true);

    const getTableWidgets = await request(app.getHttpServer())
      .get(`/widgets/${connections.secondId}?tableName=${secondTableInfo.testTableName}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');
    const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
    t.is(getTableWidgets.status, 403);
    t.is(getTableWidgetsRO.message, Messages.DONT_HAVE_PERMISSIONS);
    t.pass();
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'POST /widget/:slug';

test(`${currentTest} should throw an exception do not have permissions`, async (t) => {
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

    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      'id',
      firstTableInfo.testTableColumnName,
    );

    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${connections.firstId}?tableName=${firstTableInfo.testTableName}}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 403);
    t.is(createTableWidgetRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});

test(`${currentTest} should throw an exception, when you try add widget in connection, when you do not have permissions`, async (t) => {
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
    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForUsersTable(
      'id',
      firstTableInfo.testTableColumnName,
    );

    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${connections.secondId}?tableName=${secondTableInfo.testTableName}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 403);
    t.is(createTableWidgetRO.message, Messages.DONT_HAVE_PERMISSIONS);
  } catch (e) {
    console.error(e);
  }
});
