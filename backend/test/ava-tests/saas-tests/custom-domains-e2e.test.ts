/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { sendRequestToSaasPart } from '../../utils/send-request-to-saas-part.util.js';
import { TestUtils } from '../../utils/test.utils.js';
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../../utils/user-with-different-permissions-utils.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
// import nock from 'nock';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

// custom domains test (available only in saas mode)

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication() as any;
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(WinstonLogger)));
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory(validationErrors: ValidationError[] = []) {
        return new ValidationException(validationErrors);
      },
    }),
  );
  await app.init();
  app.getHttpServer().listen(0);

  // nock('https://api.stripe.com')
  //   .get(`/.*/`)
  //   .reply(200, (uri, requestBody) => {
  //     console.log('\nNOCK CALLED\n');
  //     return {
  //       object: 'list',
  //       data: [
  //         {
  //           items: [
  //             {
  //               data: [
  //                 {
  //                   price: {
  //                     id: 'annual_team_test',
  //                   },
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //       ],
  //     };
  //   });
});

test.after(async () => {
  try {
    // nock.cleanAll();
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
});

// test.beforeEach(async () => {
//   await testUtils.databaseService.dropDatabase();
// });

currentTest = 'POST custom-domain/register/:companyId';
test.serial(`${currentTest} - should return registered custom domain`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;
    const customDomain = faker.internet.domainName();
    const requestDomainData = {
      hostname: customDomain,
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );
    const registerDomainResponseRO = await registerDomainResponse.json();
    t.is(registerDomainResponse.status, 201);

    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial(`${currentTest} - should throw exception when hostname is incorrect`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;

    const requestDomainData = {
      hostname: 'incorrect-domain',
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );
    t.is(registerDomainResponse.status, 400);
  } catch (error) {
    t.fail(error.message);
  }
});

currentTest = 'GET custom-domain/:companyId';

test.serial(`${currentTest} - should return found custom domain`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;
    const customDomain = faker.internet.domainName();
    const requestDomainData = {
      hostname: customDomain,
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );
    t.is(registerDomainResponse.status, 201);
    const registerDomainResponseRO = await registerDomainResponse.json();

    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);

    const foundDomainResponse = await sendRequestToSaasPart(
      `custom-domain/${companyId}`,
      'GET',
      undefined,
      adminUserToken,
    );
    t.is(foundDomainResponse.status, 200);
    const foundDomainResponseRO = await foundDomainResponse.json();
    t.is(foundDomainResponseRO.hasOwnProperty('success'), true);
    t.is(foundDomainResponseRO.hasOwnProperty('domain_info'), true);

    const domainInfo = foundDomainResponseRO.domain_info;

    t.is(domainInfo.hostname, customDomain);
    t.is(domainInfo.companyId, companyId);
    t.is(domainInfo.hasOwnProperty('id'), true);
    t.is(domainInfo.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(domainInfo).length, 5);

    const foundCompanyFullInfoResponse = await request(app.getHttpServer())
      .get('/company/my/full')
      .set('Content-Type', 'application/json')
      .set('Cookie', simpleUserToken)
      .set('Accept', 'application/json');

    t.is(foundCompanyFullInfoResponse.status, 200);
    const foundCompanyFullInfoResponseRO = JSON.parse(foundCompanyFullInfoResponse.text);
    t.is(foundCompanyFullInfoResponseRO.hasOwnProperty('custom_domain'), true);
    t.is(foundCompanyFullInfoResponseRO.custom_domain, requestDomainData.hostname);
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial(`${currentTest} - should throw exception when company id is invalid`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;
    const customDomain = faker.internet.domainName();
    const requestDomainData = {
      hostname: customDomain,
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );
    t.is(registerDomainResponse.status, 201);
    const registerDomainResponseRO = await registerDomainResponse.json();

    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);

    const foundDomainResponse = await sendRequestToSaasPart(
      `custom-domain/${faker.string.uuid()}`,
      'GET',
      undefined,
      adminUserToken,
    );
    t.is(foundDomainResponse.status, 404);
  } catch (error) {
    t.fail(error.message);
  }
});

currentTest = 'PUT custom-domain/update/:companyId';
test.serial(`${currentTest} - should return updated custom domain`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;
    const customDomain = faker.internet.domainName();
    const requestDomainData = {
      hostname: customDomain,
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );
    t.is(registerDomainResponse.status, 201);
    const registerDomainResponseRO = await registerDomainResponse.json();

    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);

    const updatedCustomDomain = faker.internet.domainName();
    const updateDomainData = {
      hostname: updatedCustomDomain,
    };
    const updateDomainResponse = await sendRequestToSaasPart(
      `custom-domain/update/${companyId}`,
      'PUT',
      updateDomainData,
      adminUserToken,
    );

    const updateDomainResponseRO = await updateDomainResponse.json();
    t.is(updateDomainResponse.status, 200);
    t.is(updateDomainResponseRO.hostname, updatedCustomDomain);
    t.is(updateDomainResponseRO.companyId, companyId);
    t.is(updateDomainResponseRO.hasOwnProperty('id'), true);
    t.is(updateDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(updateDomainResponseRO.hasOwnProperty('updatedAt'), true);
    t.is(Object.keys(updateDomainResponseRO).length, 5);
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial(`${currentTest} - should throw exception when hostname is invalid`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;
    const customDomain = faker.internet.domainName();
    const requestDomainData = {
      hostname: customDomain,
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );

    const registerDomainResponseRO = await registerDomainResponse.json();
    t.is(registerDomainResponse.status, 201);
    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);

    const updateDomainData = {
      hostname: 'incorrect-domain',
    };
    const updateDomainResponse = await sendRequestToSaasPart(
      `custom-domain/update/${companyId}`,
      'PUT',
      updateDomainData,
      adminUserToken,
    );
    t.is(updateDomainResponse.status, 400);
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial(`${currentTest} - should throw exception when company id is incorrect`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;
    const customDomain = faker.internet.domainName();
    const requestDomainData = {
      hostname: customDomain,
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );
    t.is(registerDomainResponse.status, 201);
    const registerDomainResponseRO = await registerDomainResponse.json();

    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);

    const updatedCustomDomain = faker.internet.domainName();
    const updateDomainData = {
      hostname: updatedCustomDomain,
    };
    const updateDomainResponse = await sendRequestToSaasPart(
      `custom-domain/update/${registerDomainResponseRO.id}/${faker.string.uuid()}`,
      'PUT',
      updateDomainData,
      adminUserToken,
    );
    t.is(updateDomainResponse.status, 404);
  } catch (error) {
    t.fail(error.message);
  }
});

currentTest = 'DELETE custom-domain/delete/:companyId';
test.serial(`${currentTest} - should delete custom domain`, async (t) => {
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

    const companyId = foundCompanyInfoRO.id;
    const customDomain = faker.internet.domainName();
    const requestDomainData = {
      hostname: customDomain,
    };
    const registerDomainResponse = await sendRequestToSaasPart(
      `custom-domain/register/${companyId}`,
      'POST',
      requestDomainData,
      adminUserToken,
    );
    t.is(registerDomainResponse.status, 201);
    const registerDomainResponseRO = await registerDomainResponse.json();

    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);

    const deleteDomainResponse = await sendRequestToSaasPart(
      `custom-domain/delete/${companyId}`,
      'DELETE',
      undefined,
      adminUserToken,
    );
    t.is(deleteDomainResponse.status, 200);
    const deleteDomainResponseRO = await deleteDomainResponse.json();
    t.is(deleteDomainResponseRO.success, true);

    // check that domain was deleted

    const foundDomainResponse = await sendRequestToSaasPart(
      `custom-domain/${companyId}`,
      'GET',
      undefined,
      adminUserToken,
    );

    const foundDomainResponseRO = await foundDomainResponse.json();
    t.is(foundDomainResponseRO.hasOwnProperty('success'), true);
    t.is(foundDomainResponseRO.success, false);
    t.is(foundDomainResponseRO.hasOwnProperty('domain_info'), true);
    t.is(foundDomainResponseRO.domain_info, null);
  } catch (error) {
    t.fail(error.message);
  }
});
