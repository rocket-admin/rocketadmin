/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Constants } from '../../src/helpers/constants/constants.js';
import { TestUtils } from './test.utils.js';
import { isSaaS } from '../../src/helpers/app/is-saas.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../../src/entities/company-info/application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { BaseType } from '../../src/common/data-injection.tokens.js';
import { UserEntity } from '../../src/entities/user/user.entity.js';
import { CompanyInfoEntity } from '../../src/entities/company-info/company-info.entity.js';
import { generateGwtToken } from '../../src/entities/user/utils/generate-gwt-token.js';
import { UserRoleEnum } from '../../src/entities/user/enums/user-role.enum.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function registerUserAndReturnUserInfo(app: INestApplication): Promise<{
  token: string;
  email: string;
  password: string;
}> {
  if (isSaaS()) {
    return await registerUserOnSaasAndReturnUserInfo();
  }
  const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
  const userRepository = dataSource.getRepository(UserEntity);
  const companyRepository = dataSource.getRepository(CompanyInfoEntity);

  const email = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.internet.email()}`.toLowerCase();
  const password = `#r@dY^e&7R4b5Ib@31iE4xbn`;
  const companyName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.company.name()}`;

  // Create company
  const company = companyRepository.create({
    id: faker.string.uuid(),
    name: companyName,
  });
  const savedCompany = await companyRepository.save(company);

  // Create user
  const user = userRepository.create({
    email,
    password,
    isActive: true,
    company: savedCompany,
    role: UserRoleEnum.ADMIN,
  });
  const savedUser = await userRepository.save(user);

  // Generate JWT token
  const tokenData = generateGwtToken(savedUser, []);
  const token = `${Constants.JWT_COOKIE_KEY_NAME}=${tokenData.token}`;

  return { token, email, password };
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
  invitedUserEmail?: string,
): Promise<{
  email: string;
  password: string;
  token: string;
}> {
  return await inviteUserInCompanyAndGroupAndAcceptInvitation(inviterJwtToken, role, groupId, app, invitedUserEmail);
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
  newEmail?: string,
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
  if (!newEmail) {
    newEmail = `${faker.lorem.words(1)}_${faker.lorem.words(1)}_${faker.internet.email()}`;
  }
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

  const invitationRO: InvitedUserInCompanyAndConnectionGroupDs & { verificationString: string } = JSON.parse(
    invitationResult.text,
  );
  if (invitationResult.status > 201) {
    console.info('invitationResult.body -> ', invitationRO);
  }
  const verificationResult = await request(app.getHttpServer())
    .post(`/company/invite/verify/${invitationRO.verificationString}`)
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
