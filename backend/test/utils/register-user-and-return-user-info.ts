import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Constants } from '../../src/helpers/constants/constants.js';
import { TestUtils } from './test.utils.js';
import { request as undiciRequest } from 'undici';

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

  const result = await undiciRequest('http://rocketadmin-private-microservice:3001/saas/user/register', {
    method: 'POST',
    body: JSON.stringify(userRegisterInfo),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if(result.statusCode > 201) {
    console.info('result.body -> ', await result.body.json());
  }
  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(result)}`;
  return { token: token, ...userRegisterInfo };
}

type RegisterUserData = {
  email: string;
  password: string;
};
