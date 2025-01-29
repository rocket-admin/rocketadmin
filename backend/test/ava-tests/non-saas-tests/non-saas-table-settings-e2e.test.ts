/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { QueryOrderingEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest;

test.before(async () => {
  setSaasEnvVariable();
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
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
    console.error('After tests error ' + e);
  }
});

currentTest = 'GET /settings/';

test.serial(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
  try {
    const { token } = await registerUserAndReturnUserInfo(app);
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const tableName = '';
    const findSettingsResponce = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findSettingsResponce.status, 400);
    const findSettingsRO = JSON.parse(findSettingsResponce.text);
    t.is(findSettingsRO.message, Messages.TABLE_NAME_MISSING);
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw an exception when connectionId is missing`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = '';
    const tableName = faker.lorem.words();
    const findSettingsResponce = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(findSettingsResponce.status, 400);
    const findSettingsRO = JSON.parse(findSettingsResponce.text);
    t.is(findSettingsRO.message, Messages.CONNECTION_ID_MISSING);
  } catch (e) {
    console.error(e);
  }
});

test.serial(
  `${currentTest} should return an empty connection settings object, when setting does not exists for this table in connection`,
  async (t) => {
    try {
      const newConnection = getTestData(mockFactory).newConnectionToTestDB;
      const { token } = await registerUserAndReturnUserInfo(app);

      const createdConnection = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const connectionId = JSON.parse(createdConnection.text).id;

      const tableName = faker.lorem.words();
      const findSettingsResponce = await request(app.getHttpServer())
        .get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      t.is(findSettingsResponce.status, 200);
      const findSettingsRO = JSON.parse(findSettingsResponce.text);
      t.deepEqual(findSettingsRO, {});
    } catch (e) {
      console.error(e);
    }
  },
);

test.serial(`${currentTest} should return connection settings object`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const tableName = 'connection';
    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connectionId,
      tableName,
      ['title'],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const findSettingsResponce = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${connectionId}&tableName=connection`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const findSettingsRO = JSON.parse(findSettingsResponce.text);
    t.is(findSettingsRO.hasOwnProperty('id'), true);
    t.is(findSettingsRO.table_name, 'connection');
    t.is(findSettingsRO.display_name, createTableSettingsDTO.display_name);
    t.deepEqual(findSettingsRO.search_fields, ['title']);
    t.deepEqual(findSettingsRO.excluded_fields, []);
    t.deepEqual(findSettingsRO.list_fields, []);
    t.is(findSettingsRO.list_per_page, 3);
    t.is(findSettingsRO.ordering, 'DESC');
    t.is(findSettingsRO.ordering_field, 'port');
    t.deepEqual(findSettingsRO.readonly_fields, []);
    t.deepEqual(findSettingsRO.sortable_by, []);
    t.deepEqual(findSettingsRO.autocomplete_columns, []);
    t.deepEqual(findSettingsRO.identification_fields, []);
    t.is(findSettingsRO.connection_id, connectionId);
  } catch (e) {
    console.error(e);
  }
});

currentTest = 'POST /settings/';

test.serial(`${currentTest} should return created table settings`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connectionId,
      'connection',
      ['title'],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=connection`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 201);

    const findSettingsResponce = await request(app.getHttpServer())
      .get(`/settings/?connectionId=${connectionId}&tableName=connection`)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const findSettingsRO = JSON.parse(findSettingsResponce.text);
    t.is(findSettingsRO.hasOwnProperty('id'), true);
    t.is(findSettingsRO.table_name, 'connection');
    t.is(findSettingsRO.display_name, createTableSettingsDTO.display_name);
    t.deepEqual(findSettingsRO.search_fields, ['title']);
    t.deepEqual(findSettingsRO.excluded_fields, []);
    t.deepEqual(findSettingsRO.list_fields, []);
    t.is(findSettingsRO.list_per_page, 3);
    t.is(findSettingsRO.ordering, 'DESC');
    t.is(findSettingsRO.ordering_field, 'port');
    t.deepEqual(findSettingsRO.readonly_fields, []);
    t.deepEqual(findSettingsRO.sortable_by, []);
    t.deepEqual(findSettingsRO.autocomplete_columns, []);
    t.is(findSettingsRO.connection_id, connectionId);
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw exception when tableName is missing`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connectionId,
      'connection',
      ['title'],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const tableName = '';
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, Messages.TABLE_NAME_MISSING);
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw exception when connectionId is missing`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = '';

    const createTableSettingsDTO = mockFactory.generateTableSettings(
      connectionId,
      'connection',
      ['title'],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const tableName = faker.lorem.words(1);
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, Messages.CONNECTION_ID_MISSING);
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw exception when search_fields is not an array`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
      connectionId,
      'connection',
      'title',
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
    );

    const tableName = 'connection';
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, 'The field "search_fields" must be an array');
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw exception when excluded_fields is not an array`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
      connectionId,
      'connection',
      ['title'],
      'type',
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
    );

    const tableName = 'connection';
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, 'The field "excluded_fields" must be an array');
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw exception when list_fields is not an array`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
      connectionId,
      'connection',
      ['title'],
      undefined,
      'type',
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
    );

    const tableName = 'connection';
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, 'The field "list_fields" must be an array');
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw exception when readonly_fields is not an array`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
      connectionId,
      'connection',
      ['title'],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      'type',
      undefined,
      undefined,
    );

    const tableName = 'connection';
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, 'The field "readonly_fields" must be an array');
  } catch (e) {
    console.error(e);
  }
});

test.serial(`${currentTest} should throw exception when sortable_by is not an array`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
      connectionId,
      'connection',
      ['title'],
      undefined,
      undefined,
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      'type',
      undefined,
    );

    const tableName = 'connection';
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, 'The field "sortable_by" must be an array');
  } catch (e) {
    console.error(e);
  }
});

test.serial(
  `${currentTest} should throw exception when there are no such field in the table for searching`,
  async (t) => {
    try {
      const newConnection = getTestData(mockFactory).newConnectionToTestDB;
      const { token } = await registerUserAndReturnUserInfo(app);

      const createdConnection = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const connectionId = JSON.parse(createdConnection.text).id;

      const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
        connectionId,
        'connection',
        ['testField'],
        undefined,
        undefined,
        3,
        QueryOrderingEnum.DESC,
        'port',
        undefined,
        undefined,
        undefined,
      );

      const tableName = 'connection';
      const createTableSettingsResponse = await request(app.getHttpServer())
        .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
        .send(createTableSettingsDTO)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createTableSettingsResponse.status, 400);
      const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
      t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
    } catch (e) {
      console.error(e);
    }
  },
);

test.serial(
  `${currentTest} should throw exception when there are no such field in the table for excluding`,
  async (t) => {
    try {
      const newConnection = getTestData(mockFactory).newConnectionToTestDB;
      const { token } = await registerUserAndReturnUserInfo(app);

      const createdConnection = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const connectionId = JSON.parse(createdConnection.text).id;

      const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
        connectionId,
        'connection',
        ['type'],
        ['testField'],
        undefined,
        3,
        QueryOrderingEnum.DESC,
        'port',
        undefined,
        undefined,
        undefined,
      );

      const tableName = 'connection';
      const createTableSettingsResponse = await request(app.getHttpServer())
        .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
        .send(createTableSettingsDTO)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createTableSettingsResponse.status, 400);
      const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
      t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
    } catch (e) {
      console.error(e);
    }
  },
);

test.serial(`${currentTest} should throw exception when there are no such field in the table for list`, async (t) => {
  try {
    const newConnection = getTestData(mockFactory).newConnectionToTestDB;
    const { token } = await registerUserAndReturnUserInfo(app);

    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;

    const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
      connectionId,
      'connection',
      ['type'],
      undefined,
      ['testField'],
      3,
      QueryOrderingEnum.DESC,
      'port',
      undefined,
      undefined,
      undefined,
    );

    const tableName = 'connection';
    const createTableSettingsResponse = await request(app.getHttpServer())
      .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
      .send(createTableSettingsDTO)
      .set('Cookie', token)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(createTableSettingsResponse.status, 400);
    const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
    t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
  } catch (e) {
    console.error(e);
  }
});

test.serial(
  `${currentTest} should throw exception when there are no such field in the table for read only`,
  async (t) => {
    try {
      const newConnection = getTestData(mockFactory).newConnectionToTestDB;
      const { token } = await registerUserAndReturnUserInfo(app);

      const createdConnection = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const connectionId = JSON.parse(createdConnection.text).id;

      const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
        connectionId,
        'connection',
        ['type'],
        undefined,
        undefined,
        3,
        QueryOrderingEnum.DESC,
        'port',
        ['testField'],
        undefined,
        undefined,
      );

      const tableName = 'connection';
      const createTableSettingsResponse = await request(app.getHttpServer())
        .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
        .send(createTableSettingsDTO)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      t.is(createTableSettingsResponse.status, 400);
      const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
      t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
    } catch (e) {
      console.error(e);
    }
  },
);

test.serial(
  `${currentTest} should throw exception when there are no such field in the table for sorting`,
  async (t) => {
    try {
      const newConnection = getTestData(mockFactory).newConnectionToTestDB;
      const { token } = await registerUserAndReturnUserInfo(app);

      const createdConnection = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const connectionId = JSON.parse(createdConnection.text).id;

      const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
        connectionId,
        'connection',
        ['type'],
        undefined,
        undefined,
        3,
        QueryOrderingEnum.DESC,
        'port',
        undefined,
        ['testField'],
        undefined,
      );

      const tableName = 'connection';
      const createTableSettingsResponse = await request(app.getHttpServer())
        .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
        .send(createTableSettingsDTO)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createTableSettingsResponse.status, 400);
      const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
      t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
    } catch (e) {
      console.error(e);
    }
  },
);
