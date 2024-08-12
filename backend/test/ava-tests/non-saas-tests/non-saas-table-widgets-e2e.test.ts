/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { compareTableWidgetsArrays } from '../../utils/compare-table-widgets-arrays.js';
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

const tableNameForWidgets = 'connection';

const uuidRegex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

test.after.always('Close app connection', async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After custom field error: ' + e);
  }
});

currentTest = 'GET /widgets/:slug';

test.serial(`${currentTest} should return empty array, table widgets not created`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;

  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(getTableWidgets.status, 200);
  t.is(typeof getTableWidgetsRO, 'object');
  t.is(getTableWidgetsRO.length, 0);
});

test.serial(`${currentTest} should return array of table widgets for table`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);

  t.is(Array.isArray(createTableWidgetRO), true);
  t.is(createTableWidgetRO.length, newTableWidgets.length);
  t.is(createTableWidgetRO[0].widget_type, newTableWidgets[0].widget_type);
  t.is(createTableWidgetRO[1].field_name, newTableWidgets[1].field_name);
  t.is(createTableWidgetRO[0].name, newTableWidgets[0].name);

  t.is(createTableWidgetRO[0].description, newTableWidgets[0].description);

  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getTableWidgets.status, 200);
  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(typeof getTableWidgetsRO, 'object');
  t.is(getTableWidgetsRO.length, 2);

  t.is(getTableWidgetsRO[0].field_name, newTableWidgets[0].field_name);
  t.is(getTableWidgetsRO[1].widget_type, newTableWidgets[1].widget_type);

  const getTableStructureResponse = await request(app.getHttpServer())
    .get(`/table/structure/${connectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getTableStructureResponse.status, 200);
  const getTableStructureRO = JSON.parse(getTableStructureResponse.text);
  t.is(getTableStructureRO.hasOwnProperty('table_widgets'), true);
  t.is(getTableStructureRO.table_widgets.length, 2);
  t.is(getTableStructureRO.table_widgets[0].field_name, newTableWidgets[0].field_name);
  t.is(getTableStructureRO.table_widgets[1].widget_type, newTableWidgets[1].widget_type);
  t.is(compareTableWidgetsArrays(getTableStructureRO.table_widgets, newTableWidgets), true);
});

test.serial(`${currentTest} should throw exception when connection id not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Cookie', token)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);

  t.is(Array.isArray(createTableWidgetRO), true);
  t.is(createTableWidgetRO.length, newTableWidgets.length);
  t.is(createTableWidgetRO[0].widget_type, newTableWidgets[0].widget_type);
  t.is(createTableWidgetRO[1].field_name, newTableWidgets[1].field_name);
  t.is(createTableWidgetRO[0].name, newTableWidgets[0].name);

  t.is(createTableWidgetRO[0].description, newTableWidgets[0].description);

  const emptyConnectionId = '';
  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${emptyConnectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getTableWidgets.status, 404);
});

test.serial(`${currentTest} should throw exception when connection id passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);

  t.is(Array.isArray(createTableWidgetRO), true);
  t.is(createTableWidgetRO.length, newTableWidgets.length);
  t.is(createTableWidgetRO[0].widget_type, newTableWidgets[0].widget_type);
  t.is(createTableWidgetRO[1].field_name, newTableWidgets[1].field_name);
  t.is(createTableWidgetRO[0].name, newTableWidgets[0].name);

  t.is(createTableWidgetRO[0].description, newTableWidgets[0].description);

  const fakeConnectionId = faker.string.uuid();
  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${fakeConnectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  t.is(getTableWidgets.status, 403);
  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(getTableWidgetsRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should throw exception when tableName passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);

  t.is(Array.isArray(createTableWidgetRO), true);
  t.is(createTableWidgetRO.length, newTableWidgets.length);
  t.is(createTableWidgetRO[0].widget_type, newTableWidgets[0].widget_type);
  t.is(createTableWidgetRO[1].field_name, newTableWidgets[1].field_name);
  t.is(createTableWidgetRO[0].name, newTableWidgets[0].name);

  t.is(createTableWidgetRO[0].description, newTableWidgets[0].description);

  const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=${fakeTableName}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(getTableWidgets.status, 400);

  t.is(getTableWidgetsRO.message, Messages.TABLE_NOT_FOUND);
});

test.serial(`${currentTest} should throw exception when tableName not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);

  t.is(Array.isArray(createTableWidgetRO), true);
  t.is(createTableWidgetRO.length, newTableWidgets.length);
  t.is(createTableWidgetRO[0].widget_type, newTableWidgets[0].widget_type);
  t.is(createTableWidgetRO[1].field_name, newTableWidgets[1].field_name);
  t.is(createTableWidgetRO[0].name, newTableWidgets[0].name);

  t.is(createTableWidgetRO[0].description, newTableWidgets[0].description);

  const fakeTableName = '';
  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=${fakeTableName}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');

  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(getTableWidgets.status, 400);

  t.is(getTableWidgetsRO.message, Messages.TABLE_NAME_MISSING);
});

currentTest = 'POST /widget/:slug';
test.serial(`${currentTest} should return created table widgets`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidget = mockFactory.generateCreateWidgetDTOForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=connection`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);

  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=connection`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getTableWidgets.status, 200);
  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(typeof getTableWidgetsRO, 'object');
  t.is(getTableWidgetsRO.length, 2);

  t.is(getTableWidgetsRO[0].widget_type, newTableWidget.widget_type);
  t.is(compareTableWidgetsArrays(getTableWidgetsRO, newTableWidgets), true);
});

test.serial(`${currentTest} hould return updated table widgets`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);
  const updatedTableWidgets = mockFactory.generateUpdateWidgetDTOsArrayForConnectionTable();
  const updateTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: updatedTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const updateTableWidgetRO = JSON.parse(updateTableWidgetResponse.text);

  t.is(updateTableWidgetResponse.status, 201);

  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getTableWidgets.status, 200);
  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(typeof getTableWidgetsRO, 'object');
  t.is(getTableWidgetsRO.length, 2);

  t.is(getTableWidgetsRO[0].widget_type, updatedTableWidgets[0].widget_type);
  t.is(compareTableWidgetsArrays(getTableWidgetsRO, updatedTableWidgets), true);
});

test.serial(`${currentTest} should return updated table widgets when old widget updated and new added`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const connectionId = JSON.parse(createdConnection.text).id;
  newTableWidgets.shift();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);
  const updatedTableWidgets = mockFactory.generateUpdateWidgetDTOsArrayForConnectionTable();
  const updateTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: updatedTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const updateTableWidgetRO = JSON.parse(updateTableWidgetResponse.text);

  t.is(updateTableWidgetResponse.status, 201);

  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('masterpwd', 'ahalaimahalai')
    .set('Cookie', token)
    .set('Accept', 'application/json');
  t.is(getTableWidgets.status, 200);
  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(typeof getTableWidgetsRO, 'object');
  t.is(getTableWidgetsRO.length, 2);

  t.is(getTableWidgetsRO[0].widget_type, updatedTableWidgets[0].widget_type);

  t.is(compareTableWidgetsArrays(getTableWidgetsRO, updatedTableWidgets), true);
});

test.serial(`${currentTest} should return table widgets without deleted widget`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 201);

  const copyWidgets = [...newTableWidgets];
  copyWidgets.splice(1, 1);

  const updateTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: copyWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const updateTableWidgetRO = JSON.parse(updateTableWidgetResponse.text);
  t.is(updateTableWidgetRO.length, 1);

  t.is(updateTableWidgetResponse.status, 201);

  const getTableWidgets = await request(app.getHttpServer())
    .get(`/widgets/${connectionId}?tableName=${tableNameForWidgets}`)
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(getTableWidgets.status, 200);
  const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
  t.is(typeof getTableWidgetsRO, 'object');
  t.is(getTableWidgetsRO.length, 1);
});

test.serial(
  `${currentTest} should throw exception when table widget with incorrect type passed in request`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const newConnection = getTestData(mockFactory).newEncryptedConnection;
    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;
    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
    const copyWidgets = [...newTableWidgets];
    copyWidgets[0].widget_type = faker.lorem.words(1);
    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
      .send({ widgets: copyWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 400);
    t.is(createTableWidgetRO.message, Messages.WIDGET_TYPE_INCORRECT);
  },
);

test.serial(
  `${currentTest} should throw exception when table widget passed in request has incorrect field_name`,
  async (t) => {
    const { token } = await registerUserAndReturnUserInfo(app);
    const newConnection = getTestData(mockFactory).newEncryptedConnection;
    const createdConnection = await request(app.getHttpServer())
      .post('/connection')
      .send(newConnection)
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const connectionId = JSON.parse(createdConnection.text).id;
    const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
    const copyWidgets = [...newTableWidgets];
    copyWidgets[0].field_name = faker.lorem.words(1);
    const createTableWidgetResponse = await request(app.getHttpServer())
      .post(`/widget/${connectionId}?tableName=${tableNameForWidgets}`)
      .send({ widgets: newTableWidgets })
      .set('Content-Type', 'application/json')
      .set('Cookie', token)
      .set('masterpwd', 'ahalaimahalai')
      .set('Accept', 'application/json');
    const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
    t.is(createTableWidgetResponse.status, 400);
    t.is(createTableWidgetRO.message, Messages.EXCLUDED_OR_NOT_EXISTS(copyWidgets[0].field_name));
  },
);

test.serial(`${currentTest} should throw exception when connection id not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const emptyId = '';
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${emptyId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  t.is(createTableWidgetResponse.status, 404);
});

test.serial(`${currentTest} should throw exception when connection id passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const connectionId = JSON.parse(createdConnection.text).id;
  const fakeConnectionId = faker.string.uuid();
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${fakeConnectionId}?tableName=${tableNameForWidgets}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 403);
  t.is(createTableWidgetRO.message, Messages.DONT_HAVE_PERMISSIONS);
});

test.serial(`${currentTest} should throw exception when tableName passed in request is incorrect`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;

  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${fakeTableName}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 400);
  t.is(createTableWidgetRO.message, Messages.TABLE_NOT_FOUND);
});

test.serial(`${currentTest} should throw exception when tableName not passed in request`, async (t) => {
  const { token } = await registerUserAndReturnUserInfo(app);
  const newConnection = getTestData(mockFactory).newEncryptedConnection;
  const createdConnection = await request(app.getHttpServer())
    .post('/connection')
    .send(newConnection)
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  const connectionId = JSON.parse(createdConnection.text).id;
  const newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
  const fakeTableName = '';
  const createTableWidgetResponse = await request(app.getHttpServer())
    .post(`/widget/${connectionId}?tableName=${fakeTableName}`)
    .send({ widgets: newTableWidgets })
    .set('Content-Type', 'application/json')
    .set('Cookie', token)
    .set('masterpwd', 'ahalaimahalai')
    .set('Accept', 'application/json');
  const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
  t.is(createTableWidgetResponse.status, 400);
  t.is(createTableWidgetRO.message, Messages.TABLE_NAME_MISSING);
});
