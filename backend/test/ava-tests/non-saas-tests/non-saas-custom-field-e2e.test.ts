/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../../../src/app.module.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';
import cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MockFactory } from '../../mock.factory.js';
import { Encryptor } from '../../../src/helpers/encryption/encryptor.js';
import test from 'ava';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { getTestData } from '../../utils/get-test-data.js';
import request from 'supertest';
import { replaceTextInCurlies } from '../../../src/helpers/index.js';
import { faker } from '@faker-js/faker';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { ErrorsMessages } from '../../../src/exceptions/custom-exceptions/messages/custom-errors-messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

let app: INestApplication;
let testUtils: TestUtils;

const mockFactory = new MockFactory();

const masterPwd = 'ahalaimahalai';

const decryptValue = (data) => {
  return Encryptor.decryptData(data);
};

const decryptValueMaterPwd = (data) => {
  return Encryptor.decryptDataMasterPwd(data, masterPwd);
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
});

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
});

let currentTest = 'GET /fields/:slug';
test.serial(`${currentTest} should return empty array, when custom fields not created`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const getCustomFieldsRO = JSON.parse(getCustomFields.text);
  t.is(getCustomFields.status, 200);
  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 0);
});

test.serial(`${currentTest} should return custom fields array, when custom fields are created`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);

  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');

  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const getTableRowsResponse = await request(app.getHttpServer())
    .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getTableRowsResponse.status, 200);
  const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
  t.is(getTableRowsRO.rows.length >= 10, true);
  for (const row of getTableRowsRO.rows) {
    t.is(row.hasOwnProperty('#autoadmin:customFields'), true);
    t.is(typeof row['#autoadmin:customFields'], 'object');
    t.is(row['#autoadmin:customFields'].length, 1);
    t.is(row['#autoadmin:customFields'][0].type, newCustomField.type);
    t.is(row['#autoadmin:customFields'][0].text, newCustomField.text);
    const urlTemplate = replaceTextInCurlies(newCustomField.template_string, ['id', 'title'], [row.id, row.title]);
    t.is(row['#autoadmin:customFields'][0].url_template, urlTemplate);
  }
});

test.serial(`${currentTest} should throw exception when connection id not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);

  t.is(createConnectionResponse.status, 201);

  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  t.is(createCustomFieldResponse.status, 201);

  createConnectionRO.id = '';
  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 404);
});

test.serial(`${currentTest} should throw exception when connection id passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');

  createConnectionRO.id = faker.string.uuid();

  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);

  t.is(createCustomFieldResponse.status, 403);
  t.is(createCustomField.message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should throw exception when tableName passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const tableName = faker.lorem.words(2);
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=${tableName}`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);

  t.is(createCustomFieldResponse.status, 400);
  t.is(createCustomField.message, Messages.TABLE_NOT_FOUND);
});

test.serial(`${currentTest} should throw exception when tableName not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);

  t.is(createCustomFieldResponse.status, 400);
  t.is(createCustomField.message, Messages.TABLE_NAME_MISSING);
});

currentTest = 'POST /fields/:slug';
test.serial(`${currentTest} should return table settings with created custom field`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResponse.text);

  t.is(createConnectionResponse.status, 201);

  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');
});

test.serial(
  `${currentTest} should throw exception when custom field without text field passed in request`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newEncryptedConnection)
      .set('masterpwd', 'ahalaimahalai')
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
    delete newCustomField.text;
    const createCustomFieldResponse = await request(app.getHttpServer())
      .post(`/field/${createConnectionRO.id}?tableName=connection`)
      .send(newCustomField)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createCustomField = JSON.parse(createCustomFieldResponse.text);

    t.is(createCustomFieldResponse.status, 400);
    // t.is(createCustomField.message, ErrorsMessages.VALIDATION_FAILED);
  },
);

test.serial(
  `${currentTest} should throw exception when custom field without type field passed in request`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newEncryptedConnection)
      .set('masterpwd', 'ahalaimahalai')
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
    delete newCustomField.type;
    const createCustomFieldResponse = await request(app.getHttpServer())
      .post(`/field/${createConnectionRO.id}?tableName=connection`)
      .send(newCustomField)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createCustomField = JSON.parse(createCustomFieldResponse.text);

    t.is(createCustomFieldResponse.status, 400);
    // t.is(createCustomField.message, ErrorsMessages.VALIDATION_FAILED);
  },
);

test.serial(
  `${currentTest} should throw exception when custom field without template_string field passed in request`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newEncryptedConnection)
      .set('masterpwd', 'ahalaimahalai')
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');

    const createConnectionRO = JSON.parse(createConnectionResponse.text);

    t.is(createConnectionResponse.status, 201);
    const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
    delete newCustomField.template_string;
    const createCustomFieldResponse = await request(app.getHttpServer())
      .post(`/field/${createConnectionRO.id}?tableName=connection`)
      .send(newCustomField)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');

    const createCustomField = JSON.parse(createCustomFieldResponse.text);

    t.is(createCustomFieldResponse.status, 400);
    // t.is(createCustomField.message, ErrorsMessages.VALIDATION_FAILED);
  },
);

test.serial(
  `${currentTest} should throw exception when custom field with incorrect type passed in request`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newEncryptedConnection)
      .set('masterpwd', 'ahalaimahalai')
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
    newCustomField.type = 'test';
    const createCustomFieldResponse = await request(app.getHttpServer())
      .post(`/field/${createConnectionRO.id}?tableName=connection`)
      .send(newCustomField)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createCustomField = JSON.parse(createCustomFieldResponse.text);

    t.is(createCustomFieldResponse.status, 400);
    t.is(createCustomField.message, Messages.CUSTOM_FIELD_TYPE_INCORRECT);
  },
);

test.serial(
  `${currentTest} should throw complex exception when custom field with incorrect type and without text property passed in request`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newEncryptedConnection)
      .set('masterpwd', 'ahalaimahalai')
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
    newCustomField.type = 'test';
    delete newCustomField.text;
    const createCustomFieldResponse = await request(app.getHttpServer())
      .post(`/field/${createConnectionRO.id}?tableName=connection`)
      .send(newCustomField)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createCustomField = JSON.parse(createCustomFieldResponse.text);

    t.is(createCustomFieldResponse.status, 400);
    // t.is(createCustomField.message, ErrorsMessages.VALIDATION_FAILED);
  },
);

test.serial(`${currentTest} should throw exception when connection id not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  createConnectionRO.id = '';
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(createCustomFieldResponse.status, 404);
});

test.serial(`${currentTest} should throw exception when connection id passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const createConnectionRO = JSON.parse(createConnectionResponse.text);

  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  createConnectionRO.id = faker.string.uuid();
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);

  t.is(createCustomFieldResponse.status, 403);
  t.is(createCustomField.message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should throw exception when tableName passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const tableName = faker.lorem.words(2);
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=${tableName}`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);

  t.is(createCustomFieldResponse.status, 400);
  t.is(createCustomField.message, Messages.TABLE_NOT_FOUND);
});

test.serial(`${currentTest} should throw exception when tableName not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=`)
    .send(newCustomField)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);

  t.is(createCustomFieldResponse.status, 400);
  t.is(createCustomField.message, Messages.TABLE_NAME_MISSING);
});

currentTest = 'PUT /fields/:slug';
test.serial(`${currentTest} should return updated custom field`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(updateCustomFieldResponse.status, 200);
  const updateCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);

  t.is(updateCustomFieldRO.type, updateDTO.type);
  t.is(updateCustomFieldRO.template_string, updateDTO.template_string);
  t.is(updateCustomFieldRO.text, updateDTO.text);
});

test.serial(`${currentTest} should throw exception, when connection id not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  createConnectionRO.id = '';
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(updateCustomFieldResponse.status, 404);
});

test.serial(`${currentTest} should throw exception, when connection id passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  createConnectionRO.id = faker.string.uuid();
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 403);
  t.is(updatedCustomFieldRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should throw exception, when tableName passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  const tableName = faker.lorem.words();
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=${tableName}`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  t.is(updatedCustomFieldRO.message, Messages.TABLE_NOT_FOUND);
});

test.serial(`${currentTest} should throw exception, when tableName not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  const tableName = '';
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=${tableName}`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  t.is(updatedCustomFieldRO.message, Messages.TABLE_NAME_MISSING);
});

test.serial(`${currentTest} should throw exception, when field id not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: undefined,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  // t.is(updatedCustomFieldRO.message, ErrorsMessages.VALIDATION_FAILED);
});

test.serial(`${currentTest} should throw exception, when field type not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: undefined,
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  // t.is(updatedCustomFieldRO.message, ErrorsMessages.VALIDATION_FAILED);
});

test.serial(`${currentTest} should throw exception, when field type passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: faker.lorem.words(),
    text: 'updated',
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  t.is(updatedCustomFieldRO.message, Messages.CUSTOM_FIELD_TYPE_INCORRECT);
});

test.serial(`${currentTest} should throw exception, when field text is not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: undefined,
    template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
  };
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  // t.is(updatedCustomFieldRO.message, ErrorsMessages.VALIDATION_FAILED);
});

test.serial(`${currentTest} should throw exception, when field template_string is not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: undefined,
  };
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  // t.is(updatedCustomFieldRO.message, ErrorsMessages.VALIDATION_FAILED);
});

test.serial(`${currentTest} should throw exception, when fields passed in template string are incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const randomField1 = faker.lorem.words(1);
  const randomField2 = faker.lorem.words(1);
  const updateDTO = {
    id: getCustomFieldsRO[0].id,
    type: getCustomFieldsRO[0].type,
    text: 'updated',
    template_string: `https//?connectionId={{${randomField1}}}&connectionType={{${randomField2}}}`,
  };
  const updateCustomFieldResponse = await request(app.getHttpServer())
    .put(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(updateDTO)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
  t.is(updateCustomFieldResponse.status, 400);
  t.is(
    updatedCustomFieldRO.message,
    `${Messages.EXCLUDED_OR_NOT_EXISTS(randomField1)}, ${Messages.EXCLUDED_OR_NOT_EXISTS(randomField2)}`,
  );
});

test.serial(
  `${currentTest} should throw complex exception, when some required fields not passed in request`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(newEncryptedConnection)
      .set('masterpwd', 'ahalaimahalai')
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);
    const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
    const createCustomFieldResponse = await request(app.getHttpServer())
      .post(`/field/${createConnectionRO.id}?tableName=connection`)
      .send(newCustomField)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createCustomField = JSON.parse(createCustomFieldResponse.text);
    t.is(createCustomFieldResponse.status, 201);
    t.is(createCustomField.hasOwnProperty('custom_fields'), true);
    t.is(typeof createCustomField.custom_fields, 'object');

    const getCustomFields = await request(app.getHttpServer())
      .get(`/fields/${createConnectionRO.id}?tableName=connection`)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    t.is(getCustomFields.status, 200);
    const getCustomFieldsRO = JSON.parse(getCustomFields.text);

    t.is(typeof getCustomFieldsRO, 'object');
    t.is(getCustomFieldsRO.length, 1);

    t.is(getCustomFieldsRO[0].type, newCustomField.type);
    t.is(getCustomFieldsRO[0].text, newCustomField.text);
    t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

    const updateDTO = {
      id: getCustomFieldsRO[0].id,
      type: undefined,
      text: 'updated',
      template_string: undefined,
    };
    const updateCustomFieldResponse = await request(app.getHttpServer())
      .put(`/field/${createConnectionRO.id}?tableName=connection`)
      .send(updateDTO)
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');

    const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
    t.is(updateCustomFieldResponse.status, 400);
    // t.is(updatedCustomFieldRO.message, ErrorsMessages.VALIDATION_FAILED);
  },
);

currentTest = 'DELETE /fields/:slug';
test.serial(`${currentTest} should return table settings without deleted custom field`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  let getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  let getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const deleteCustomField = await request(app.getHttpServer())
    .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(deleteCustomField.status, 200);
  const deleteCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(deleteCustomFieldsRO.length, 1);

  t.is(deleteCustomFieldsRO[0].type, newCustomField.type);
  t.is(deleteCustomFieldsRO[0].text, newCustomField.text);
  t.is(deleteCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 0);
});

test.serial(`${currentTest} should throw exception, when connection id not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  createConnectionRO.id = '';
  const deleteCustomField = await request(app.getHttpServer())
    .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(deleteCustomField.status, 404);
});

test.serial(`${currentTest} should throw exception, when connection id passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  createConnectionRO.id = faker.string.uuid();
  const deleteCustomField = await request(app.getHttpServer())
    .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(deleteCustomField.status, 403);
  const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
  t.is(deleteCustomFieldsRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should throw exception, when tableName not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const deleteCustomField = await request(app.getHttpServer())
    .delete(`/field/${createConnectionRO.id}?tableName=&id=${getCustomFieldsRO[0].id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(deleteCustomField.status, 400);
  const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
  t.is(deleteCustomFieldsRO.message, Messages.TABLE_NAME_MISSING);
});

test.serial(`${currentTest} should throw exception, when tableName passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);

  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  const tableName = faker.lorem.words();
  const deleteCustomField = await request(app.getHttpServer())
    .delete(`/field/${createConnectionRO.id}?tableName=${tableName}&id=${getCustomFieldsRO[0].id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(deleteCustomField.status, 400);
  const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
  t.is(deleteCustomFieldsRO.message, Messages.TABLE_SETTINGS_NOT_FOUND);
});

test.serial(`${currentTest} should throw exception, when field id is not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  getCustomFieldsRO[0].id = '';
  const deleteCustomField = await request(app.getHttpServer())
    .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(deleteCustomField.status, 400);
  const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
  t.is(deleteCustomFieldsRO.message, Messages.UUID_INVALID);
});

test.serial(`${currentTest} should throw exception, when field id passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const { newEncryptedConnection, newEncryptedConnection2 } = getTestData(mockFactory);
  const createConnectionResponse = await request(app.getHttpServer())
    .post('/connection')
    .send(newEncryptedConnection)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createConnectionRO = JSON.parse(createConnectionResponse.text);
  t.is(createConnectionResponse.status, 201);
  const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
  const createCustomFieldResponse = await request(app.getHttpServer())
    .post(`/field/${createConnectionRO.id}?tableName=connection`)
    .send(newCustomField)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createCustomField = JSON.parse(createCustomFieldResponse.text);
  t.is(createCustomFieldResponse.status, 201);
  t.is(createCustomField.hasOwnProperty('custom_fields'), true);
  t.is(typeof createCustomField.custom_fields, 'object');

  const getCustomFields = await request(app.getHttpServer())
    .get(`/fields/${createConnectionRO.id}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getCustomFields.status, 200);
  const getCustomFieldsRO = JSON.parse(getCustomFields.text);

  t.is(typeof getCustomFieldsRO, 'object');
  t.is(getCustomFieldsRO.length, 1);

  t.is(getCustomFieldsRO[0].type, newCustomField.type);
  t.is(getCustomFieldsRO[0].text, newCustomField.text);
  t.is(getCustomFieldsRO[0].template_string, 'https//?connectionId={{id}}&connectionTitle={{title}}');

  getCustomFieldsRO[0].id = faker.string.uuid();
  const deleteCustomField = await request(app.getHttpServer())
    .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(deleteCustomField.status, 400);
  const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
  t.is(deleteCustomFieldsRO.message, Messages.CUSTOM_FIELD_NOT_FOUND);
});
