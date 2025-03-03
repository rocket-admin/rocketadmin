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
    t.is(registerDomainResponse.status, 201);
    const registerDomainResponseRO = await registerDomainResponse.json();

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

currentTest = 'GET custom-domain/:domainId/:companyId';

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
      `custom-domain/${registerDomainResponseRO.id}/${companyId}`,
      'GET',
      undefined,
      adminUserToken,
    );
    t.is(foundDomainResponse.status, 200);
    const foundDomainResponseRO = await foundDomainResponse.json();

    t.is(foundDomainResponseRO.hostname, customDomain);
    t.is(foundDomainResponseRO.companyId, companyId);
    t.is(foundDomainResponseRO.hasOwnProperty('id'), true);
    t.is(foundDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(foundDomainResponseRO).length, 5);
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
      `custom-domain/${registerDomainResponseRO.id}/${faker.string.uuid()}`,
      'GET',
      undefined,
      adminUserToken,
    );
    t.is(foundDomainResponse.status, 404);
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial(`${currentTest} - should throw exception when domain id is invalid`, async (t) => {
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
      `custom-domain/${faker.string.uuid()}/${companyId}`,
      'GET',
      undefined,
      adminUserToken,
    );
    t.is(foundDomainResponse.status, 404);
  } catch (error) {
    t.fail(error.message);
  }
});

currentTest = 'PUT custom-domain/update/:domainId/:companyId';
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
      `custom-domain/update/${registerDomainResponseRO.id}/${companyId}`,
      'PUT',
      updateDomainData,
      adminUserToken,
    );
    t.is(updateDomainResponse.status, 200);
    const updateDomainResponseRO = await updateDomainResponse.json();
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
    t.is(registerDomainResponse.status, 201);
    const registerDomainResponseRO = await registerDomainResponse.json();

    t.is(registerDomainResponseRO.hostname, customDomain);
    t.is(registerDomainResponseRO.companyId, companyId);
    t.is(registerDomainResponseRO.hasOwnProperty('id'), true);
    t.is(registerDomainResponseRO.hasOwnProperty('createdAt'), true);
    t.is(Object.keys(registerDomainResponseRO).length, 5);

    const updateDomainData = {
      hostname: 'incorrect-domain',
    };
    const updateDomainResponse = await sendRequestToSaasPart(
      `custom-domain/update/${registerDomainResponseRO.id}/${companyId}`,
      'PUT',
      updateDomainData,
      adminUserToken,
    );
    t.is(updateDomainResponse.status, 400);
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial(`${currentTest} - should throw exception when domain id is incorrect`, async (t) => {
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
      `custom-domain/update/${faker.string.uuid()}/${companyId}`,
      'PUT',
      updateDomainData,
      adminUserToken,
    );
    t.is(updateDomainResponse.status, 404);
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

currentTest = 'DELETE custom-domain/delete/:domainId/:companyId';
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
      `custom-domain/delete/${registerDomainResponseRO.id}/${companyId}`,
      'DELETE',
      undefined,
      adminUserToken,
    );
    t.is(deleteDomainResponse.status, 200);
    const deleteDomainResponseRO = await deleteDomainResponse.json();
    t.is(deleteDomainResponseRO.success, true);

    // check that domain was deleted

    const foundDomainResponse = await sendRequestToSaasPart(
      `custom-domain/${registerDomainResponseRO.id}/${companyId}`,
      'GET',
      undefined,
      adminUserToken,
    );
    t.is(foundDomainResponse.status, 404);
  } catch (error) {
    t.fail(error.message);
  }
});
