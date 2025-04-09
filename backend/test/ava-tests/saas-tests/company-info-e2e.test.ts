/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { nanoid } from 'nanoid';
import path, { join } from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import {
  inviteUserInCompanyAndAcceptInvitation,
  inviteUserInCompanyAndGroupAndAcceptInvitation,
} from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../../utils/user-with-different-permissions-utils.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
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
    t.is(Object.keys(foundCompanyInfoRO).length, 10);
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

    t.is(foundCompanyInfo.status, 200);
    t.is(foundCompanyInfoRO.hasOwnProperty('id'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('name'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('additional_info'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('address'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('createdAt'), true);
    t.is(foundCompanyInfoRO.hasOwnProperty('updatedAt'), true);
    t.is(Object.keys(foundCompanyInfoRO).length, 15);
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
    t.is(Object.keys(foundCompanyInfoRO).length, 10);
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
    t.is(Object.keys(foundCompanyInfoRO[0]).length, 2);
    t.is(foundCompanyInfoRO[0].hasOwnProperty('name'), true);
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
    t.is(Object.keys(foundCompanyInfoRO[0]).length, 2);
    t.is(foundCompanyInfoRO[0].hasOwnProperty('name'), true);
  } catch (error) {
    console.error(error);
    throw error;
  }
});

currentTest = 'DELETE /:companyId/user/:userId';

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
    const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail.toLowerCase());

    t.is(foundSimpleUserInResult.email, simpleUserEmail.toLowerCase());

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

test.serial(
  `${currentTest} should remove user from company. User with the same email can be invited in this company one more time`,
  async (t) => {
    try {
      const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
      const {
        connections,
        firstTableInfo,
        groups,
        permissions,
        secondTableInfo,
        users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
        groups: { createdGroupId },
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
      const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail.toLowerCase());

      t.is(foundSimpleUserInResult.email, simpleUserEmail.toLowerCase());

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

      const invitedDeletedUser = await inviteUserInCompanyAndAcceptInvitation(
        adminUserToken,
        'USER',
        app,
        createdGroupId,
        simpleUserEmail,
      );
      t.is(invitedDeletedUser.email, simpleUserEmail);
      t.truthy(invitedDeletedUser.token);
      t.truthy(invitedDeletedUser.password);
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
);

currentTest = 'PUT invitation/revoke/:slug';

test.serial(`${currentTest} should revoke user invitation from company`, async (t) => {
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
    const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail.toLowerCase());

    const removeUserFromCompanyResult = await request(app.getHttpServer())
      .delete(`/company/${foundCompanyInfoRO.id}/user/${foundSimpleUserInResult.id}`)
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    t.is(removeUserFromCompanyResult.status, 200);

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

currentTest = `GET company/users/:companyId`;

test.serial(`${currentTest} should return users in company`, async (t) => {
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
  t.is(usersInCompanyRO.length, 2);
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

  t.is(usersInCompanyRO.length, 2);

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

  t.is(usersInCompanyROAfterUpdate.length, 2);

  for (const user of usersInCompanyROAfterUpdate) {
    t.is(user.role, 'ADMIN');
  }
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

currentTest = `PUT company/2fa/:companyId`;
test.serial(`${currentTest} should enable 2fa for company`, async (t) => {
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

  t.is(connectionsResult.status, 400);

  const connectionsResultsObject = JSON.parse(connectionsResult.text);
  t.is(connectionsResultsObject.message, Messages.TWO_FA_REQUIRED);
});

currentTest = `PUT /subscription/upgrade/:companyId`;
test.serial(
  `${currentTest} should call function subscription upgrade for company in sass, and suspend users`,
  async (t) => {
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
    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    let firstConnection = foundCompanyInfoRO.connections.find(
      (connectionRO) => connections.firstId === connectionRO.id,
    );
    const createdGroup = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);

    const additionalUsers: Array<{
      email: string;
      password: string;
      token: string;
    }> = [];
    for (let i = 0; i < 5; i++) {
      const invitationResult = await inviteUserInCompanyAndGroupAndAcceptInvitation(
        adminUserToken,
        'USER',
        createdGroup.id,
        app,
      );
      additionalUsers.push(invitationResult);
    }
    const foundCompanyInfoWithAddedUsers = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    t.is(foundCompanyInfo.status, 200);
    const foundCompanyInfoWithAddedUsersRO = JSON.parse(foundCompanyInfoWithAddedUsers.text);
    firstConnection = foundCompanyInfoWithAddedUsersRO.connections.find(
      (connectionRO) => connections.firstId === connectionRO.id,
    );
    const { users } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
    users.forEach((user: any) => {
      t.is(user.suspended, false);
    });

    const subscriptionUpgradeResult = await fetch(
      `http://rocketadmin-private-microservice:3001/saas/company/subscription/upgrade/${foundCompanyInfoRO.id}`,
      {
        method: 'POST',
        headers: {
          Cookie: adminUserToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          subscriptionLevel: 'FREE_PLAN',
        }),
      },
    );

    const foundCompanyInfoAfterUpgrade = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    const foundCompanyInfoAfterUpgradeRO = JSON.parse(foundCompanyInfoAfterUpgrade.text);
    firstConnection = foundCompanyInfoAfterUpgradeRO.connections.find(
      (connectionRO) => connections.firstId === connectionRO.id,
    );
    const { users: usersAfterUpgrade } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
    const suspendUsersCount = usersAfterUpgrade.filter((user: any) => user.suspended).length;
    t.is(suspendUsersCount, 4);
    const unSuspendedUsersCount = usersAfterUpgrade.filter((user: any) => !user.suspended).length;
    t.is(unSuspendedUsersCount, 3);

    // suspended users should not be able to access endpoints

    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', additionalUsers[additionalUsers.length - 1].token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const findAllConnectionsResponseRO = JSON.parse(findAllConnectionsResponse.text);
    t.is(findAllConnectionsResponse.status, 403);
    t.is(findAllConnectionsResponseRO.message, Messages.ACCOUNT_SUSPENDED);
  },
);

currentTest = `PUT /company/users/suspend/:companyId`;
test.serial(`${currentTest} should suspend users in company`, async (t) => {
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
  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  let firstConnection = foundCompanyInfoRO.connections.find((connectionRO) => connections.firstId === connectionRO.id);
  const createdGroup = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);

  const additionalUsers: Array<{
    email: string;
    password: string;
    token: string;
  }> = [];
  for (let i = 0; i < 5; i++) {
    const invitationResult = await inviteUserInCompanyAndGroupAndAcceptInvitation(
      adminUserToken,
      'USER',
      createdGroup.id,
      app,
    );
    additionalUsers.push(invitationResult);
  }
  const foundCompanyInfoWithAddedUsers = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);
  const foundCompanyInfoWithAddedUsersRO = JSON.parse(foundCompanyInfoWithAddedUsers.text);
  firstConnection = foundCompanyInfoWithAddedUsersRO.connections.find(
    (connectionRO) => connections.firstId === connectionRO.id,
  );
  const { users } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
  users.forEach((user: any) => {
    t.is(user.suspended, false);
  });

  const suspendUsersResult = await request(app.getHttpServer())
    .put(`/company/users/suspend/${foundCompanyInfoRO.id}`)
    .send({
      usersEmails: additionalUsers.map((user: any) => user.email),
    })
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(suspendUsersResult.status, 200);

  const foundCompanyInfoAfterSuspend = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  const foundCompanyInfoAfterSuspendRO = JSON.parse(foundCompanyInfoAfterSuspend.text);
  firstConnection = foundCompanyInfoAfterSuspendRO.connections.find(
    (connectionRO) => connections.firstId === connectionRO.id,
  );
  const { users: usersAfterSuspend } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
  const suspendUsersCount = usersAfterSuspend.filter((user: any) => user.suspended).length;
  t.is(suspendUsersCount, 5);
});

currentTest = `PUT /company/users/unsuspend/:companyId`;
test.serial(`${currentTest} should suspend users in company`, async (t) => {
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
  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  let firstConnection = foundCompanyInfoRO.connections.find((connectionRO) => connections.firstId === connectionRO.id);
  const createdGroup = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);

  const additionalUsers: Array<{
    email: string;
    password: string;
    token: string;
  }> = [];
  for (let i = 0; i < 5; i++) {
    const invitationResult = await inviteUserInCompanyAndGroupAndAcceptInvitation(
      adminUserToken,
      'USER',
      createdGroup.id,
      app,
    );
    additionalUsers.push(invitationResult);
  }
  const foundCompanyInfoWithAddedUsers = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfo.status, 200);
  const foundCompanyInfoWithAddedUsersRO = JSON.parse(foundCompanyInfoWithAddedUsers.text);
  firstConnection = foundCompanyInfoWithAddedUsersRO.connections.find(
    (connectionRO) => connections.firstId === connectionRO.id,
  );
  const { users } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
  users.forEach((user: any) => {
    t.is(user.suspended, false);
  });

  const suspendUsersResult = await request(app.getHttpServer())
    .put(`/company/users/suspend/${foundCompanyInfoRO.id}`)
    .send({
      usersEmails: additionalUsers.map((user: any) => user.email),
    })
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(suspendUsersResult.status, 200);

  const foundCompanyInfoAfterSuspend = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  const foundCompanyInfoAfterSuspendRO = JSON.parse(foundCompanyInfoAfterSuspend.text);
  firstConnection = foundCompanyInfoAfterSuspendRO.connections.find(
    (connectionRO) => connections.firstId === connectionRO.id,
  );
  const { users: usersAfterSuspend } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
  const suspendUsersCount = usersAfterSuspend.filter((user: any) => user.suspended).length;
  t.is(suspendUsersCount, 5);

  const unsuspendUsersResult = await request(app.getHttpServer())
    .put(`/company/users/unsuspend/${foundCompanyInfoRO.id}`)
    .send({
      usersEmails: additionalUsers.map((user: any) => user.email),
    })
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(unsuspendUsersResult.status, 200);

  const foundCompanyInfoAfterUnsuspend = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  const foundCompanyInfoAfterUnsuspendRO = JSON.parse(foundCompanyInfoAfterUnsuspend.text);
  firstConnection = foundCompanyInfoAfterUnsuspendRO.connections.find(
    (connectionRO) => connections.firstId === connectionRO.id,
  );
  const { users: usersAfterUnsuspend } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
  const unsuspendUsersCount = usersAfterUnsuspend.filter((user: any) => !user.suspended).length;
  t.is(unsuspendUsersCount, 7);
});

currentTest = 'PUT /company/connections/display/';
test.serial(
  `${currentTest} should toggle to 'off ' show test connections option in company. Test connections should not be returned `,
  async (t) => {
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
    const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

    const foundUserTestConnectionsInfo = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(foundUserTestConnectionsInfo.status, 200);

    const result = foundUserTestConnectionsInfo.body.connections;

    t.is(result.length, 5);

    // toggle to off
    const toggleTestConnectionsResponse = await request(app.getHttpServer())
      .put('/company/connections/display/?displayMode=off')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');
    t.is(toggleTestConnectionsResponse.status, 200);

    const resultAfterToggle = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const resultAfterToggleRO = JSON.parse(resultAfterToggle.text);
    t.is(resultAfterToggle.status, 200);
    t.is(resultAfterToggleRO.connections.length, 1);

    // toggle to on

    const toggleTestConnectionsResponseOn = await request(app.getHttpServer())
      .put('/company/connections/display/?displayMode=on')
      .set('Content-Type', 'application/json')
      .set('Cookie', adminUserToken)
      .set('Accept', 'application/json');

    t.is(toggleTestConnectionsResponseOn.status, 200);

    const resultAfterToggleOn = await request(app.getHttpServer())
      .get('/connections')
      .set('Cookie', simpleUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const resultAfterToggleOnRO = JSON.parse(resultAfterToggleOn.text);

    t.is(resultAfterToggleOn.status, 200);
    t.is(resultAfterToggleOnRO.connections.length, 5);
  },
);

currentTest = 'POST & GET /company/logo/:companyId';
test.serial(`${currentTest} should create and return found company logo after creation`, async (t) => {
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

  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  const dir = join(__dirname, 'response-files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const testLogoPatch = join(process.cwd(), 'test', 'ava-tests', 'test-files', 'test_logo.png');
  const downloadedLogoPatch = join(__dirname, 'response-files', `${foundCompanyInfoRO.id}_test_logo.png`);

  const createLogoResponse = await request(app.getHttpServer())
    .post(`/company/logo/${foundCompanyInfoRO.id}`)
    .attach('file', testLogoPatch)
    .set('Content-Type', 'image/png')
    .set('Cookie', adminUserToken)
    .set('Accept', 'image/png');

  const createLogoRO = JSON.parse(createLogoResponse.text);
  t.is(createLogoResponse.status, 201);

  const foundCompanyLogo = await request(app.getHttpServer())
    .get(`/company/logo/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyLogo.status, 200);
  const foundCompanyLogoRO = JSON.parse(foundCompanyLogo.text);
  t.is(foundCompanyLogoRO.logo.mimeType, 'image/png');
  t.is(foundCompanyLogoRO.logo.image.length > 0, true);
  fs.writeFileSync(downloadedLogoPatch, foundCompanyLogoRO.logo.image);
  const isFileExists = fs.existsSync(downloadedLogoPatch);

  t.is(isFileExists, true);

  // should return company logo for simple user

  const foundCompanyLogoForSimpleUser = await request(app.getHttpServer())
    .get(`/company/logo/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', simpleUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyLogoForSimpleUser.status, 200);
  const foundCompanyLogoForSimpleUserRO = JSON.parse(foundCompanyLogoForSimpleUser.text);
  t.is(foundCompanyLogoForSimpleUserRO.logo.mimeType, 'image/png');
  t.is(foundCompanyLogoForSimpleUserRO.logo.image.length > 0, true);

  const downloadedLogoPatchForSimpleUser = join(
    __dirname,
    'response-files',
    `${foundCompanyInfoRO.id}_simple_user_logo.png`,
  );
  fs.writeFileSync(downloadedLogoPatchForSimpleUser, foundCompanyLogoForSimpleUserRO.logo.image);
  const isFileExistsForSimpleUser = fs.existsSync(downloadedLogoPatchForSimpleUser);
  t.is(isFileExistsForSimpleUser, true);

  //should return logo in full company info for admin
  const foundCompanyInfoWithLogo = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfoWithLogo.status, 200);
  const foundCompanyInfoWithLogoRO = JSON.parse(foundCompanyInfoWithLogo.text);
  t.is(foundCompanyInfoWithLogoRO.hasOwnProperty('logo'), true);
  t.is(foundCompanyInfoWithLogoRO.logo.mimeType, 'image/png');
  t.is(foundCompanyInfoWithLogoRO.logo.image.length > 0, true);

  const downloadedLogoPatchWithLogo = join(
    __dirname,
    'response-files',
    `${foundCompanyInfoWithLogoRO.id}_admin_user_logo.png`,
  );
  fs.writeFileSync(downloadedLogoPatchWithLogo, foundCompanyInfoWithLogoRO.logo.image);
  const isFileExistsWithLogo = fs.existsSync(downloadedLogoPatchWithLogo);
  t.is(isFileExistsWithLogo, true);

  //should return logo in full company info for simple user
  const foundCompanyInfoWithLogoForSimpleUser = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', simpleUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfoWithLogoForSimpleUser.status, 200);
  const foundCompanyInfoWithLogoForSimpleUserRO = JSON.parse(foundCompanyInfoWithLogoForSimpleUser.text);
  t.is(foundCompanyInfoWithLogoForSimpleUserRO.hasOwnProperty('logo'), true);
  t.is(foundCompanyInfoWithLogoForSimpleUserRO.logo.mimeType, 'image/png');
  t.is(foundCompanyInfoWithLogoForSimpleUserRO.logo.image.length > 0, true);

  const downloadedLogoPatchForSimpleUserWithLogo = join(
    __dirname,
    'response-files',
    `${foundCompanyInfoWithLogoForSimpleUserRO.id}_simple_user_logo.png`,
  );
  fs.writeFileSync(downloadedLogoPatchForSimpleUserWithLogo, foundCompanyInfoWithLogoForSimpleUserRO.logo.image);
  const isFileExistsForSimpleUserWithLogo = fs.existsSync(downloadedLogoPatchForSimpleUserWithLogo);
  t.is(isFileExistsForSimpleUserWithLogo, true);
});

currentTest = 'POST & GET /company/favicon/:companyId';
test.serial(`${currentTest} should create and return found company favicon after creation`, async (t) => {
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

  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  const dir = join(__dirname, 'response-files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const testFaviconPatch = join(process.cwd(), 'test', 'ava-tests', 'test-files', 'test_logo.png');
  const downloadedFaviconPatch = join(__dirname, 'response-files', `${foundCompanyInfoRO.id}_test_favicon.png`);

  const createFaviconResponse = await request(app.getHttpServer())
    .post(`/company/favicon/${foundCompanyInfoRO.id}`)
    .attach('file', testFaviconPatch)
    .set('Content-Type', 'image/png')
    .set('Cookie', adminUserToken)
    .set('Accept', 'image/png');

  const createFaviconRO = JSON.parse(createFaviconResponse.text);
  t.is(createFaviconResponse.status, 201);

  const foundCompanyFavicon = await request(app.getHttpServer())
    .get(`/company/favicon/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyFavicon.status, 200);
  const foundCompanyFaviconRO = JSON.parse(foundCompanyFavicon.text);
  t.is(foundCompanyFaviconRO.favicon.mimeType, 'image/png');
  t.is(foundCompanyFaviconRO.favicon.image.length > 0, true);
  fs.writeFileSync(downloadedFaviconPatch, foundCompanyFaviconRO.favicon.image);
  const isFileExists = fs.existsSync(downloadedFaviconPatch);

  t.is(isFileExists, true);

  // should return company favicon for simple user

  const foundCompanyFaviconForSimpleUser = await request(app.getHttpServer())
    .get(`/company/favicon/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', simpleUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyFaviconForSimpleUser.status, 200);
  const foundCompanyFaviconForSimpleUserRO = JSON.parse(foundCompanyFaviconForSimpleUser.text);
  t.is(foundCompanyFaviconForSimpleUserRO.favicon.mimeType, 'image/png');
  t.is(foundCompanyFaviconForSimpleUserRO.favicon.image.length > 0, true);

  const downloadedFaviconPatchForSimpleUser = join(
    __dirname,
    'response-files',
    `${foundCompanyInfoRO.id}_simple_user_favicon.png`,
  );
  fs.writeFileSync(downloadedFaviconPatchForSimpleUser, foundCompanyFaviconForSimpleUserRO.favicon.image);
  const isFileExistsForSimpleUser = fs.existsSync(downloadedFaviconPatchForSimpleUser);
  t.is(isFileExistsForSimpleUser, true);

  //should return favicon in full company info for admin
  const foundCompanyInfoWithFavicon = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfoWithFavicon.status, 200);
  const foundCompanyInfoWithFaviconRO = JSON.parse(foundCompanyInfoWithFavicon.text);
  t.is(foundCompanyInfoWithFaviconRO.hasOwnProperty('favicon'), true);
  t.is(foundCompanyInfoWithFaviconRO.favicon.mimeType, 'image/png');
  t.is(foundCompanyInfoWithFaviconRO.favicon.image.length > 0, true);

  const downloadedFaviconPatchWithFavicon = join(
    __dirname,
    'response-files',
    `${foundCompanyInfoWithFaviconRO.id}_admin_user_favicon.png`,
  );
  fs.writeFileSync(downloadedFaviconPatchWithFavicon, foundCompanyInfoWithFaviconRO.favicon.image);
  const isFileExistsWithFavicon = fs.existsSync(downloadedFaviconPatchWithFavicon);
  t.is(isFileExistsWithFavicon, true);

  //should return favicon in full company info for simple user
  const foundCompanyInfoWithFaviconForSimpleUser = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', simpleUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfoWithFaviconForSimpleUser.status, 200);
  const foundCompanyInfoWithFaviconForSimpleUserRO = JSON.parse(foundCompanyInfoWithFaviconForSimpleUser.text);
  t.is(foundCompanyInfoWithFaviconForSimpleUserRO.hasOwnProperty('favicon'), true);
  t.is(foundCompanyInfoWithFaviconForSimpleUserRO.favicon.mimeType, 'image/png');
  t.is(foundCompanyInfoWithFaviconForSimpleUserRO.favicon.image.length > 0, true);

  const downloadedFaviconPatchForSimpleUserWithFavicon = join(
    __dirname,
    'response-files',
    `${foundCompanyInfoWithFaviconForSimpleUserRO.id}_simple_user_favicon.png`,
  );
  fs.writeFileSync(
    downloadedFaviconPatchForSimpleUserWithFavicon,
    foundCompanyInfoWithFaviconForSimpleUserRO.favicon.image,
  );
  const isFileExistsForSimpleUserWithFavicon = fs.existsSync(downloadedFaviconPatchForSimpleUserWithFavicon);
  t.is(isFileExistsForSimpleUserWithFavicon, true);
});

currentTest = 'POST & GET /company/tab-title/:companyId';
test.serial(`${currentTest} should create and return found company tab title after creation`, async (t) => {
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

  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  const newTabTitle = `${faker.company.name()}_${faker.word.noun()}`;
  const addCompanyTabTitleResponse = await request(app.getHttpServer())
    .post(`/company/tab-title/${foundCompanyInfoRO.id}`)
    .send({
      tab_title: newTabTitle,
    })
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(addCompanyTabTitleResponse.status, 201);

  const foundCompanyInfoAfterUpdate = await request(app.getHttpServer())
    .get('/company/my/full')
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyInfoAfterUpdate.status, 200);
  const foundCompanyInfoROAfterUpdate = JSON.parse(foundCompanyInfoAfterUpdate.text);
  t.is(foundCompanyInfoROAfterUpdate.hasOwnProperty('tab_title'), true);
  t.is(foundCompanyInfoROAfterUpdate.tab_title, newTabTitle);

  const foundCompanyTabTitle = await request(app.getHttpServer())
    .get(`/company/tab-title/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyTabTitle.status, 200);
  const foundCompanyTabTitleRO = JSON.parse(foundCompanyTabTitle.text);
  t.is(foundCompanyTabTitleRO.hasOwnProperty('tab_title'), true);
  t.is(foundCompanyTabTitleRO.tab_title, newTabTitle);

  //should return tab title in full company info for simple user

  const foundCompanyTabTitleForSimpleUser = await request(app.getHttpServer())
    .get(`/company/tab-title/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', simpleUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyTabTitleForSimpleUser.status, 200);
  const foundCompanyTabTitleForSimpleUserRO = JSON.parse(foundCompanyTabTitleForSimpleUser.text);
  t.is(foundCompanyTabTitleForSimpleUserRO.hasOwnProperty('tab_title'), true);
  t.is(foundCompanyTabTitleForSimpleUserRO.tab_title, newTabTitle);
});

currentTest = 'GET /company/white-label-properties/:companyId';
test.serial(`${currentTest} should return found company white label properties for company admin user`, async (t) => {
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

  const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

  // crete company logo
  const dir = join(__dirname, 'response-files');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const testLogoPatch = join(process.cwd(), 'test', 'ava-tests', 'test-files', 'test_logo.png');
  const downloadedLogoPatch = join(__dirname, 'response-files', `${foundCompanyInfoRO.id}_test_logo.png`);

  const createLogoResponse = await request(app.getHttpServer())
    .post(`/company/logo/${foundCompanyInfoRO.id}`)
    .attach('file', testLogoPatch)
    .set('Content-Type', 'image/png')
    .set('Cookie', adminUserToken)
    .set('Accept', 'image/png');

  const createLogoRO = JSON.parse(createLogoResponse.text);
  t.is(createLogoResponse.status, 201);

  // crete company favicon
  const testFaviconPatch = join(process.cwd(), 'test', 'ava-tests', 'test-files', 'test_logo.png');
  const downloadedFaviconPatch = join(__dirname, 'response-files', `${foundCompanyInfoRO.id}_test_favicon.png`);

  const createFaviconResponse = await request(app.getHttpServer())
    .post(`/company/favicon/${foundCompanyInfoRO.id}`)
    .attach('file', testFaviconPatch)
    .set('Content-Type', 'image/png')
    .set('Cookie', adminUserToken)
    .set('Accept', 'image/png');

  const createFaviconRO = JSON.parse(createFaviconResponse.text);
  t.is(createFaviconResponse.status, 201);

  // crete company tab title
  const newTabTitle = `${faker.company.name()}_${faker.word.noun()}`;
  const addCompanyTabTitleResponse = await request(app.getHttpServer())
    .post(`/company/tab-title/${foundCompanyInfoRO.id}`)
    .send({
      tab_title: newTabTitle,
    })
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(addCompanyTabTitleResponse.status, 201);

  // should return all white label properties for company

  const foundCompanyWhiteLabelProperties = await request(app.getHttpServer())
    .get(`/company/white-label-properties/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', adminUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyWhiteLabelProperties.status, 200);
  const foundCompanyWhiteLabelPropertiesRO = JSON.parse(foundCompanyWhiteLabelProperties.text);
  t.is(foundCompanyWhiteLabelPropertiesRO.hasOwnProperty('logo'), true);
  t.is(foundCompanyWhiteLabelPropertiesRO.hasOwnProperty('favicon'), true);
  t.is(foundCompanyWhiteLabelPropertiesRO.hasOwnProperty('tab_title'), true);
  t.is(foundCompanyWhiteLabelPropertiesRO.logo.mimeType, 'image/png');
  t.is(foundCompanyWhiteLabelPropertiesRO.logo.image.length > 0, true);
  t.is(foundCompanyWhiteLabelPropertiesRO.favicon.mimeType, 'image/png');
  t.is(foundCompanyWhiteLabelPropertiesRO.favicon.image.length > 0, true);
  t.is(foundCompanyWhiteLabelPropertiesRO.tab_title, newTabTitle);

  //should return all white label properties for simple user

  const foundCompanyWhiteLabelPropertiesForSimpleUser = await request(app.getHttpServer())
    .get(`/company/white-label-properties/${foundCompanyInfoRO.id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', simpleUserToken)
    .set('Accept', 'application/json');

  t.is(foundCompanyWhiteLabelPropertiesForSimpleUser.status, 200);
  const foundCompanyWhiteLabelPropertiesForSimpleUserRO = JSON.parse(
    foundCompanyWhiteLabelPropertiesForSimpleUser.text,
  );
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.hasOwnProperty('logo'), true);
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.hasOwnProperty('favicon'), true);
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.hasOwnProperty('tab_title'), true);
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.logo.mimeType, 'image/png');
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.logo.image.length > 0, true);
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.favicon.mimeType, 'image/png');
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.favicon.image.length > 0, true);
  t.is(foundCompanyWhiteLabelPropertiesForSimpleUserRO.tab_title, newTabTitle);
});
