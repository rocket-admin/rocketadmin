import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import * as faker from 'faker';
import * as request from 'supertest';

import { ApplicationModule } from '../src/app.module';
import { compareArrayElements } from '../src/helpers';
import { Connection } from 'typeorm';
import { DaoPostgres } from '../src/dal/dao/dao-postgres';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { Encryptor } from '../src/helpers/encryption/encryptor';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { Test } from '@nestjs/testing';
import { TestUtils } from './test.utils';

describe('Table widgets(e2e)', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnection2;
  let decryptValue;
  let decryptValueMaterPwd;
  let newTableWidget;
  let newTableWidgets;
  let updatedTableWidgets;
  let masterPwd;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();

    testUtils = moduleFixture.get<TestUtils>(TestUtils);
    await testUtils.resetDb();
    app = moduleFixture.createNestApplication();
    await app.init();

    newConnection = mockFactory.generateCreateEncryptedInternalConnectionDto();
    newConnection2 = mockFactory.generateCreateEncryptedConnectionDto();
    newTableWidget = mockFactory.generateCreateWidgetDTOForConnectionTable();
    newTableWidgets = mockFactory.generateCreateWidgetDTOsArrayForConnectionTable();
    updatedTableWidgets = mockFactory.generateUpdateWidgetDTOsArrayForConnectionTable();
    masterPwd = 'ahalaimahalai';
    decryptValue = function (data) {
      return Encryptor.decryptData(data);
    };

    decryptValueMaterPwd = function (data) {
      return Encryptor.decryptDataMasterPwd(data, masterPwd);
    };

    AWSMock.setSDKInstance(AWS);
    AWSMock.mock(
      'CognitoIdentityServiceProvider',
      'listUsers',
      (newCognitoUserName, callback: (...args: any) => void) => {
        callback(null, {
          Users: [
            {
              Attributes: [
                {},
                {},
                {
                  Value: 'Example@gmail.com',
                },
              ],
            },
          ],
        });
      },
    );
    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse.status).toBe(200);
  });

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  afterAll(async () => {
    try {
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      const connect = await app.get(Connection);
      if (connect.isConnected) {
        await connect.close();
      }
      await app.close();
    } catch (e) {
      console.error('After all table-widgets error: ' + e);
    }
  });

  afterEach(async () => {
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
    await DaoPostgres.clearKnexCache();
    AWSMock.restore('CognitoIdentityServiceProvider');
  });

  describe('GET /widgets/:slug', () => {
    it('should return empty array, table widgets not created', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(getTableWidgets.status).toBe(200);
        expect(typeof getTableWidgetsRO).toBe('object');
        expect(getTableWidgetsRO.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });

    it('should return array of table widgets for table', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        expect(Array.isArray(createTableWidgetRO)).toBeTruthy();
        expect(createTableWidgetRO.length).toBe(newTableWidgets.length);
        expect(createTableWidgetRO[0].widget_type).toBe(newTableWidgets[0].widget_type);
        expect(createTableWidgetRO[1].field_name).toBe(newTableWidgets[1].field_name);
        expect(createTableWidgetRO[0].name).toBe(newTableWidgets[0].name);
        expect(uuidRegex.test(createTableWidgetRO[1].id)).toBeTruthy();
        expect(createTableWidgetRO[0].description).toBe(newTableWidgets[0].description);

        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableWidgets.status).toBe(200);
        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(typeof getTableWidgetsRO).toBe('object');
        expect(getTableWidgetsRO.length).toBe(2);
        expect(uuidRegex.test(getTableWidgetsRO[0].id)).toBeTruthy();
        expect(getTableWidgetsRO[0].field_name).toBe(newTableWidgets[0].field_name);
        expect(getTableWidgetsRO[1].widget_type).toBe(newTableWidgets[1].widget_type);
        expect(compareArrayElements(getTableWidgetsRO[0].widget_params, newTableWidgets[0].widget_params)).toBeTruthy();

        const getTableStructureResponse = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableStructureResponse.status).toBe(200);
        const getTableStructureRO = JSON.parse(getTableStructureResponse.text);
        expect(getTableStructureRO.hasOwnProperty('table_widgets')).toBeTruthy();
        expect(getTableStructureRO.table_widgets.length).toBe(2);
        expect(getTableStructureRO.table_widgets[0].field_name).toBe(newTableWidgets[0].field_name);
        expect(getTableStructureRO.table_widgets[1].widget_type).toBe(newTableWidgets[1].widget_type);
        expect(
          compareArrayElements(getTableStructureRO.table_widgets[0].widget_params, newTableWidgets[0].widget_params),
        ).toBeTruthy();
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when connection id not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        expect(Array.isArray(createTableWidgetRO)).toBeTruthy();
        expect(createTableWidgetRO.length).toBe(newTableWidgets.length);
        expect(createTableWidgetRO[0].widget_type).toBe(newTableWidgets[0].widget_type);
        expect(createTableWidgetRO[1].field_name).toBe(newTableWidgets[1].field_name);
        expect(createTableWidgetRO[0].name).toBe(newTableWidgets[0].name);
        expect(uuidRegex.test(createTableWidgetRO[1].id)).toBeTruthy();
        expect(createTableWidgetRO[0].description).toBe(newTableWidgets[0].description);

        createConnectionRO.id = '';
        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableWidgets.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when connection id passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        expect(Array.isArray(createTableWidgetRO)).toBeTruthy();
        expect(createTableWidgetRO.length).toBe(newTableWidgets.length);
        expect(createTableWidgetRO[0].widget_type).toBe(newTableWidgets[0].widget_type);
        expect(createTableWidgetRO[1].field_name).toBe(newTableWidgets[1].field_name);
        expect(createTableWidgetRO[0].name).toBe(newTableWidgets[0].name);
        expect(uuidRegex.test(createTableWidgetRO[1].id)).toBeTruthy();
        expect(createTableWidgetRO[0].description).toBe(newTableWidgets[0].description);

        createConnectionRO.id = faker.random.uuid();
        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        expect(getTableWidgets.status).toBe(403);
        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(getTableWidgetsRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when tableName passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        expect(Array.isArray(createTableWidgetRO)).toBeTruthy();
        expect(createTableWidgetRO.length).toBe(newTableWidgets.length);
        expect(createTableWidgetRO[0].widget_type).toBe(newTableWidgets[0].widget_type);
        expect(createTableWidgetRO[1].field_name).toBe(newTableWidgets[1].field_name);
        expect(createTableWidgetRO[0].name).toBe(newTableWidgets[0].name);
        expect(uuidRegex.test(createTableWidgetRO[1].id)).toBeTruthy();
        expect(createTableWidgetRO[0].description).toBe(newTableWidgets[0].description);

        const fakeTableName = faker.random.word(1);
        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=${fakeTableName}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(getTableWidgets.status).toBe(400);

        expect(getTableWidgetsRO.message).toBe(Messages.TABLE_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when tableName not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        expect(Array.isArray(createTableWidgetRO)).toBeTruthy();
        expect(createTableWidgetRO.length).toBe(newTableWidgets.length);
        expect(createTableWidgetRO[0].widget_type).toBe(newTableWidgets[0].widget_type);
        expect(createTableWidgetRO[1].field_name).toBe(newTableWidgets[1].field_name);
        expect(createTableWidgetRO[0].name).toBe(newTableWidgets[0].name);
        expect(uuidRegex.test(createTableWidgetRO[1].id)).toBeTruthy();
        expect(createTableWidgetRO[0].description).toBe(newTableWidgets[0].description);

        const fakeTableName = '';
        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=${fakeTableName}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(getTableWidgets.status).toBe(400);

        expect(getTableWidgetsRO.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('POST /widget/:slug', () => {
    it('should return created table widgets', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableWidgets.status).toBe(200);
        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(typeof getTableWidgetsRO).toBe('object');
        expect(getTableWidgetsRO.length).toBe(2);
        expect(uuidRegex.test(getTableWidgetsRO[0].id)).toBeTruthy();
        expect(getTableWidgetsRO[0].widget_type).toBe(newTableWidget.widget_type);
        expect(compareArrayElements(getTableWidgetsRO[0].widget_params, newTableWidgets[0].widget_params)).toBeTruthy();
        expect(uuidRegex.test(getTableWidgetsRO[0].id)).toBeTruthy();
      } catch (err) {
        throw err;
      }
    });

    it('should return updated table widgets', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        const updateTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: updatedTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const updateTableWidgetRO = JSON.parse(updateTableWidgetResponse.text);
        console.log('=>(table-widgets.e2e.spec.ts:438) updateTableWidgetRO', updateTableWidgetRO);

        expect(updateTableWidgetResponse.status).toBe(201);

        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableWidgets.status).toBe(200);
        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(typeof getTableWidgetsRO).toBe('object');
        expect(getTableWidgetsRO.length).toBe(2);
        expect(uuidRegex.test(getTableWidgetsRO[0].id)).toBeTruthy();
        expect(getTableWidgetsRO[0].widget_type).toBe(updatedTableWidgets[0].widget_type);
        expect(
          compareArrayElements(getTableWidgetsRO[1].widget_params, updatedTableWidgets[1].widget_params),
        ).toBeTruthy();
        expect(uuidRegex.test(getTableWidgetsRO[0].id)).toBeTruthy();
      } catch (err) {
        throw err;
      }
    });

    it('should return table widgets without deleted widget', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(201);

        const copyWidgets = [...newTableWidgets];
        copyWidgets.splice(1, 1);

        const updateTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: copyWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const updateTableWidgetRO = JSON.parse(updateTableWidgetResponse.text);
        expect(updateTableWidgetRO.length).toBe(1);

        expect(updateTableWidgetResponse.status).toBe(201);

        const getTableWidgets = await request(app.getHttpServer())
          .get(`/widgets/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableWidgets.status).toBe(200);
        const getTableWidgetsRO = JSON.parse(getTableWidgets.text);
        expect(typeof getTableWidgetsRO).toBe('object');
        expect(getTableWidgetsRO.length).toBe(1);
        expect(uuidRegex.test(getTableWidgetsRO[0].id)).toBeTruthy();
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when table widget with incorrect type passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const copyWidgets = [...newTableWidgets];
        copyWidgets[0].widget_type = faker.random.word(1);
        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: copyWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(400);
        expect(createTableWidgetRO.message).toBe(Messages.WIDGET_TYPE_INCORRECT);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when table widget passed in request has incorrect field_name', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const copyWidgets = [...newTableWidgets];
        copyWidgets[0].field_name = faker.random.word(1);
        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(400);
        expect(createTableWidgetRO.message).toBe(Messages.EXCLUDED_OR_NOT_EXISTS(copyWidgets[0].field_name));
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when connection id not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = '';
        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(createTableWidgetResponse.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when connection id passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = faker.random.uuid();
        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=connection`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(403);
        expect(createTableWidgetRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when tableName passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeTableName = faker.random.word(1);
        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=${fakeTableName}`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(400);
        expect(createTableWidgetRO.message).toBe(Messages.TABLE_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when tableName not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeTableName = '';
        const createTableWidgetResponse = await request(app.getHttpServer())
          .post(`/widget/${createConnectionRO.id}?tableName=${fakeTableName}`)
          .send({ widgets: newTableWidgets })
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createTableWidgetRO = JSON.parse(createTableWidgetResponse.text);
        expect(createTableWidgetResponse.status).toBe(400);
        expect(createTableWidgetRO.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });
  });
});
