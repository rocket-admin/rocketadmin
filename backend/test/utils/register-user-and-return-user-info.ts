import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Constants } from '../../src/helpers/constants/constants';
import { TestUtils } from './test.utils';

export async function registerUserAndReturnUserInfo(app: INestApplication): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  const userRegisterInfo: RegisterUserData = {
    email: `${faker.random.words(1)}_${faker.random.words(1)}_${faker.internet.email()}`,
    password: 'ahalai-mahalai',
  };

  const registerAdminUserResponse = await request(app.getHttpServer())
    .post('/user/register/')
    .send(userRegisterInfo)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  if (registerAdminUserResponse.status > 300) {
    console.log('registerAdminUserResponse.text -> ', registerAdminUserResponse.text);
  }

  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(registerAdminUserResponse)}`;
  return { token: token, ...userRegisterInfo };
}

type RegisterUserData = {
  email: string;
  password: string;
};
