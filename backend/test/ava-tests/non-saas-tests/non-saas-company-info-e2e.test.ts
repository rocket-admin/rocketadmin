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
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../../utils/user-with-different-permissions-utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { faker } from '@faker-js/faker';
import { nanoid } from 'nanoid';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { Messages } from '../../../src/exceptions/text/messages.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

test.before(async () => {
  setSaasEnvVariable();
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

test.serial(`${currentTest} should return found company info for user`, async (t) => {
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
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 3);
  } catch (error) {
    console.error(error);
  }
});

currentTest = 'GET /company/my/full';

test.serial(`${currentTest} should return full found company info for company admin user`, async (t) => {
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
    // console.log(
    //   `🚀 ~ file: non-saas-company-info-e2e.test.ts:87 ~ test ~ foundCompanyInfoRO: \n\n
    // ${JSON.stringify(foundCompanyInfoRO)}
    // \n\n
    // `
    // );

    t.is(foundCompanyInfo.status, 200);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 5);
    t.is(foundCompanyInfoRO.hasOwnProperty('connections'), true);
    t.is(foundCompanyInfoRO.connections.length > 3, true);
    t.is(foundCompanyInfoRO.hasOwnProperty('invitations'), true);
    t.is(foundCompanyInfoRO.invitations.length, 0);
    t.is(Object.keys(foundCompanyInfoRO.connections[0]).length, 7);
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
    t.is(Object.keys(foundCompanyInfoRO.connections[0].groups[0].users[0]).length, 9);
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

test.serial(`${currentTest} should return found company info for non-admin user`, async (t) => {
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
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 3);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'GET /company/my/email';

test.serial(`${currentTest} should return found company infos for admin user`, async (t) => {
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
  } catch (error) {
    console.error(error);
    throw error;
  }
});

test.serial(`${currentTest} should return found company infos for non-admin user`, async (t) => {
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
    t.is(foundCompanyInfoRO[0].hasOwnProperty('id'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'POST /company/remove';

test.serial(`${currentTest} should remove user from company`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    t.is(foundCompanyInfo.status, 200);

    const allGroupsInResult = foundCompanyInfoRO.connections.map((connection) => connection.groups).flat();
    const allUsersInResult = allGroupsInResult.map((group) => group.users).flat();
    const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail);

    t.is(foundSimpleUserInResult.email, simpleUserEmail);

    const removeUserFromCompanyResult = await request(app.getHttpServer())
      .delete(`/company/${foundCompanyInfoRO.id}/user/${foundSimpleUserInResult.id}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const removeUserFromCompany = JSON.parse(removeUserFromCompanyResult.text);

    t.is(removeUserFromCompanyResult.status, 200);
    t.is(removeUserFromCompany.success, true);

    const foundCompanyInfoAfterUserDeletion = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoROAfterUserDeletion = JSON.parse(foundCompanyInfoAfterUserDeletion.text);

    const allGroupsInResultAfterUserDeletion = foundCompanyInfoROAfterUserDeletion.connections
      .map((connection) => connection.groups)
      .flat();
    const allUsersInResultAfterUserDeletion = allGroupsInResultAfterUserDeletion.map((group) => group.users).flat();
    const foundSimpleUserInResultAfterUserDeletion = !!allUsersInResultAfterUserDeletion.find(
      (user) => user.email === simpleUserEmail,
    );

    t.is(foundSimpleUserInResultAfterUserDeletion, false);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT invitation/revoke/:slug';

test.serial(`${currentTest} should remove user invitation from company`, async (t) => {
  try {
    const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
    const {
      connections,
      firstTableInfo,
      groups,
      permissions,
      secondTableInfo,
      users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
    } = testData;

    const foundCompanyInfo = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
    t.is(foundCompanyInfoRO.invitations.length, 0);

    const allGroupsInResult = foundCompanyInfoRO.connections.map((connection) => connection.groups).flat();
    const allUsersInResult = allGroupsInResult.map((group) => group.users).flat();
    const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail);

    const removeUserFromCompanyResult = await request(app.getHttpServer())
      .delete(`/company/${foundCompanyInfoRO.id}/user/${foundSimpleUserInResult.id}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const invitationRequestBody = {
      companyId: foundCompanyInfoRO.id,
      email: simpleUserEmail,
      role: 'USER',
      groupId: foundCompanyInfoRO.connections[0].groups[0].id,
    };

    const invitationResult = await request(app.getHttpServer())
      .put(`/company/user/${foundCompanyInfoRO.id}`)
      .send(invitationRequestBody)
      .set('Cookie', adminUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    console.log(invitationResult.text);
    t.is(invitationResult.status, 200);

    const foundCompanyInfoWithInvitation = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoWithInvitationRO = JSON.parse(foundCompanyInfoWithInvitation.text);
    t.is(foundCompanyInfoWithInvitationRO.invitations.length, 1);

    const deleteInvitationResult = await request(app.getHttpServer())
      .put(`/company/invitation/revoke/${foundCompanyInfoRO.id}`)
      .send({
        email: simpleUserEmail,
      })
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    t.is(deleteInvitationResult.status, 200);

    const foundCompanyInfoAfterInvitationDeletion = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoROAfterInvitationDeletion = JSON.parse(foundCompanyInfoAfterInvitationDeletion.text);
    t.is(foundCompanyInfoROAfterInvitationDeletion.invitations.length, 0);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'PUT company/name/:slug';

test.serial(`${currentTest} should update company name`, async (t) => {
  const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
  const {
    connections,
    firstTableInfo,
    groups,
    permissions,
    secondTableInfo,
    users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
  } = testData;

  const foundCompanyInfo = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);
  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
  t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);

  const newName = `${faker.company.name()}_${nanoid(5)}`;

  const updateCompanyNameResult = await request(app.getHttpServer())
    .put(`/company/name/${foundCompanyInfoRO.id}`)
    .send({
      name: newName,
    })
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');
  t.is(updateCompanyNameResult.status, 200);

  const foundCompanyInfoAfterUpdate = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);
  const foundCompanyInfoROAfterUpdate = JSON.parse(foundCompanyInfoAfterUpdate.text);
  t.is(foundCompanyInfoROAfterUpdate.hasOwnProperty('name'), true);
  t.is(foundCompanyInfoROAfterUpdate.name, newName);
});

currentTest = 'GET company/name/:companyId';

test.serial(`${currentTest} should return company name`, async (t) => {
  const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
  const {
    connections,
    firstTableInfo,
    groups,
    permissions,
    secondTableInfo,
    users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
  } = testData;

  const foundCompanyInfo = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);

  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  const foundCompanyName = await request(app.getHttpServer())
    .get(`/company/name/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  t.is(foundCompanyName.status, 200);
  const foundCompanyNameRO = JSON.parse(foundCompanyName.text);
  t.is(foundCompanyNameRO.hasOwnProperty('name'), true);
  t.is(foundCompanyNameRO.name, foundCompanyInfoRO.name);
  t.pass();
});

currentTest = `PUT company/users/roles/:companyId`;

test.serial(`${currentTest} should update user roles in company`, async (t) => {
  const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
  const {
    connections,
    firstTableInfo,
    groups,
    permissions,
    secondTableInfo,
    users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
  } = testData;

  const foundCompanyInfo = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);

  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  const usersInCompany = await request(app.getHttpServer())
    .get(`/company/users/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(usersInCompany.status, 200);
  const usersInCompanyRO = JSON.parse(usersInCompany.text);

  t.is(usersInCompanyRO.length > 0, true);

  const foundNonAdminUser = usersInCompanyRO.find((user) => user.role === 'USER');
  t.is(!!foundNonAdminUser, true);

  const updateUserRoleRequest = {
    users: [
      {
        userId: foundNonAdminUser.id,
        role: 'ADMIN',
      },
    ],
  };

  const updateUserRoleResult = await request(app.getHttpServer())
    .put(`/company/users/roles/${foundCompanyInfoRO.id}`)
    .send(updateUserRoleRequest)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(updateUserRoleResult.status, 200);
  const updateUserRoleResultRO = JSON.parse(updateUserRoleResult.text);
  t.is(updateUserRoleResultRO.success, true);

  const usersInCompanyAfterUpdate = await request(app.getHttpServer())
    .get(`/company/users/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(usersInCompanyAfterUpdate.status, 200);
  const usersInCompanyROAfterUpdate = JSON.parse(usersInCompanyAfterUpdate.text);

  t.is(usersInCompanyRO.length > 0, true);

  const foundUserAfterUpdate = usersInCompanyROAfterUpdate.find((user) => user.id === foundNonAdminUser.id);
  t.is(foundUserAfterUpdate.role, 'ADMIN');
});

currentTest = `PUT company/2fa/:companyId`;

test.skip(`${currentTest} should enable 2fa for company`, async (t) => {
  const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
  const {
    connections,
    firstTableInfo,
    groups,
    permissions,
    secondTableInfo,
    users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail, simpleUserPassword },
  } = testData;

  const foundCompanyInfo = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);

  const foundCompanyRo = JSON.parse(foundCompanyInfo.text);
  t.is(foundCompanyRo.hasOwnProperty('is2faEnabled'), true);
  t.is(foundCompanyRo.is2faEnabled, false);

  const requestBody = {
    is2faEnabled: true,
  };
  const enable2faResult = await request(app.getHttpServer())
    .put(`/company/2fa/${foundCompanyRo.id}`)
    .send(requestBody)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(enable2faResult.status, 200);

  const foundCompanyInfoAfterUpdate = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfoAfterUpdate.status, 200);
  const foundCompanyRoAfterUpdate = JSON.parse(foundCompanyInfoAfterUpdate.text);
  t.is(foundCompanyRoAfterUpdate.hasOwnProperty('is2faEnabled'), true);
  t.is(foundCompanyRoAfterUpdate.is2faEnabled, true);

  // user should not be able to use endpoints that require 2fa after login

  const userLoginInfo = {
    email: simpleUserEmail,
    password: simpleUserPassword,
  };

  const loginUserResponse = await request(app.getHttpServer())
    .post('/user/login/')
    .send(userLoginInfo)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  if (loginUserResponse.status > 201) {
    console.info('loginUserResponse.text -> ', loginUserResponse.text);
  }

  const newSimpleUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(loginUserResponse)}`;
  const connectionsResult = await request(app.getHttpServer())
    .get('/connections')
    .set('Content-Type', 'application/json')
    .set('Cookie', newSimpleUserToken)
    .set('Accept', 'application/json');

  t.is(connectionsResult.status, 401);

  const connectionsResultsObject = JSON.parse(connectionsResult.text);
  t.is(connectionsResultsObject.message, Messages.TWO_FA_REQUIRED);
});

currentTest = `DELETE company`;

test.serial(`${currentTest} should delete company`, async (t) => {
  const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
  const {
    connections,
    firstTableInfo,
    groups,
    permissions,
    secondTableInfo,
    users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
  } = testData;
  const foundCompanyInfo = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);

  const deleteCompanyResult = await request(app.getHttpServer())
    .delete(`/company/my`)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(deleteCompanyResult.status, 200);
  const deleteCompanyResultRO = JSON.parse(deleteCompanyResult.text);
  t.is(deleteCompanyResultRO.success, true);

  const foundCompanyInfoAfterDelete = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfoAfterDelete.status, 403);
});
