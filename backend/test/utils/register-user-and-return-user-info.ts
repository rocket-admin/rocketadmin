import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Constants } from '../../src/helpers/constants/constants.js';
import { TestUtils } from './test.utils.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function registerUserAndReturnUserInfo(app: INestApplication): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  // return await registerUserOnCoreAndReturnUserInfo(app);
  return await registerUserOnSaasAndReturnUserInfo();
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

export async function registerUserOnSaasAndReturnUserInfo(): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  const userRegisterInfo: RegisterUserData & { companyName: string } = {
    email: `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.internet.email()}`,
    password: `#r@dY^e&7R4b5Ib@31iE4xbn`,
    companyName: `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.company.name()}}`,
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
}
