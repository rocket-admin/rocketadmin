/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Constants } from '../../src/helpers/constants/constants.js';
import { TestUtils } from './test.utils.js';
import { isSaaS } from '../../src/helpers/app/is-saas.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../../src/entities/company-info/application/data-structures/invited-user-in-company-and-connection-group.ds.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function registerUserAndReturnUserInfo(app: INestApplication): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  if (!isSaaS()) {
    return await loginTestAdminUserAndReturnInfo(app);
  }
  // return await registerUserOnCoreAndReturnUserInfo(app);
  return await registerUserOnSaasAndReturnUserInfo();
}

export async function loginTestAdminUserAndReturnInfo(app: INestApplication): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  const userLoginInfo = {
    email: 'admin@email.local',
    password: 'test12345',
  };
  const loginAdminUserResponse = await request(app.getHttpServer())
    .post('/user/login/')
    .send(userLoginInfo)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const loginAdminUserResponseJson = JSON.parse(loginAdminUserResponse.text);
  if (loginAdminUserResponse.status > 201) {
    console.info('loginAdminUserResponseJson.text -> ', loginAdminUserResponseJson);
  }

  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(loginAdminUserResponse)}`;
  return { token: token, ...userLoginInfo };
}

export async function registerUserOnCoreAndReturnUserInfo(app: INestApplication): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  const userRegisterInfo: RegisterUserData = {
    email: `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.internet.email()}`,
    password: '#r@dY^e&7R4b5Ib@31iE4xbn',
  };

  const registerAdminUserResponse = await request(app.getHttpServer())
    .post('/user/register/')
    .send(userRegisterInfo)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  if (registerAdminUserResponse.status > 300) {
    console.info('registerAdminUserResponse.text -> ', registerAdminUserResponse.text);
  }

  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(registerAdminUserResponse)}`;
  return { token: token, ...userRegisterInfo };
}

export async function registerUserOnSaasAndReturnUserInfo(
  email: string = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.internet.email()}`,
): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  const userRegisterInfo: RegisterUserData & { companyName: string } = {
    email: email,
    password: `#r@dY^e&7R4b5Ib@31iE4xbn`,
    companyName: `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.company.name()}`,
  };

  const result = await fetch('http://rocketadmin-private-microservice:3001/saas/user/register', {
    method: 'POST',
    body: JSON.stringify(userRegisterInfo),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  if (result.status > 201) {
    console.info('result.body -> ', await result.json());
  }
  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse2(result)}`;
  return { token: token, ...userRegisterInfo };
}

type RegisterUserData = {
  email: string;
  password: string;
};

export async function inviteUserInCompanyAndAcceptInvitation(
  inviterJwtToken: string,
  role: 'ADMIN' | 'USER' = 'USER',
  app: INestApplication,
  groupId: string,
): Promise<{
  email: string;
  password: string;
  token: string;
}> {
  return await inviteUserInCompanyAndGroupAndAcceptInvitation(inviterJwtToken, role, groupId, app);
  /*

  const foundUser: any = await request(app.getHttpServer())
    .get('/user/')
    .set('Cookie', inviterJwtToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const foundUserJson = JSON.parse(foundUser.text);

  const newEmail = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.internet.email()}`;
  const newPassword = `#r@dY^e&7R4b5Ib@31iE4xbn`;
  const invitationRequestBody = {
    companyId: foundUserJson.company.id,
    userEmail: newEmail,
    role: role,
  };

  const invitationResult = await fetch('http://rocketadmin-private-microservice:3001/company/user/', {
    method: 'PUT',
    body: JSON.stringify(invitationRequestBody),
    headers: {
      Cookie: inviterJwtToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (invitationResult.status > 201) {
    console.info('invitationResult.body -> ', await invitationResult.json());
  }
  const verificationResult = await fetch('http://rocketadmin-private-microservice:3001/company/user/accept/test', {
    method: 'POST',
    body: JSON.stringify({
      email: newEmail,
      password: newPassword,
    }),
    headers: {
      Cookie: inviterJwtToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  if (verificationResult.status > 201) {
    console.info('verificationResult.body -> ', await verificationResult.json());
  }
  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse2(verificationResult)}`;

  return { email: newEmail, password: newPassword, token: token };
  */
}

export async function inviteUserInCompanyAndGroupAndAcceptInvitation(
  inviterJwtToken: string,
  role: 'ADMIN' | 'USER' = 'USER',
  groupId: string,
  app: INestApplication,
): Promise<{
  email: string;
  password: string;
  token: string;
}> {
  const foundUser: any = await request(app.getHttpServer())
    .get('/user/')
    .set('Cookie', inviterJwtToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const foundUserJson = JSON.parse(foundUser.text);
  const companyId = foundUserJson.company.id;
  const newEmail = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.internet.email()}`;
  const newPassword = `#r@dY^e&7R4b5Ib@31iE4xbn`;
  const invitationRequestBody = {
    companyId: foundUserJson.company.id,
    email: newEmail,
    role: role,
    groupId: groupId,
  };

  const invitationResult = await request(app.getHttpServer())
    .put(`/company/user/${companyId}`)
    .send(invitationRequestBody)
    .set('Cookie', inviterJwtToken)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const invitationRO: InvitedUserInCompanyAndConnectionGroupDs = JSON.parse(invitationResult.text);
  if (invitationResult.status > 201) {
    console.info('invitationResult.body -> ', invitationRO);
  }
  const verificationResult = await request(app.getHttpServer())
    .post(`/company/invite/verify/test`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send({
      password: newPassword,
      userName: newEmail,
    });
  const verificationRO = JSON.parse(verificationResult.text);
  if (verificationResult.status > 201) {
    console.info('verificationResult.body -> ', verificationRO);
  }
  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(verificationResult)}`;
  return { email: newEmail, password: newPassword, token: token };
}
