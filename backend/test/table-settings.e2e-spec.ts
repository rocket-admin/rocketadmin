import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import * as faker from 'faker';
import * as request from 'supertest';

import { ApplicationModule } from '../src/app.module';
import { Connection } from 'typeorm';
import { DaoPostgres } from '../src/dal/dao/dao-postgres';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { QueryOrderingEnum } from '../src/enums';
import { Test } from '@nestjs/testing';
import { TestUtils } from './test.utils';

describe('Table settings (e2e)', () => {
  jest.setTimeout(10000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnection2;
  let newConnectionToTestDB;
  let newSettings;

  beforeEach(async () => {
    jest.setTimeout(30000);
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();

    testUtils = moduleFixture.get<TestUtils>(TestUtils);
    await testUtils.resetDb();
    app = moduleFixture.createNestApplication();
    await app.init();
    newConnection = mockFactory.generateCreateConnectionDto();
    newConnection2 = mockFactory.generateCreateConnectionDto2();
    newConnectionToTestDB = mockFactory.generateCreateConnectionDtoToTEstDB();

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

  afterEach(async () => {
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
    await DaoPostgres.clearKnexCache();
    AWSMock.restore('CognitoIdentityServiceProvider');
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
      console.error('After all table-settings error: ' + e);
    }
  });

  describe('GET /settings/', () => {
    it('should throw an exception when tableName is missing', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const connectionId = JSON.parse(createdConnection.text).id;
        const tableName = '';
        const findSettingsResponce = await request(app.getHttpServer())
          .get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findSettingsResponce.status).toBe(400);
        const findSettingsRO = JSON.parse(findSettingsResponce.text);
        expect(findSettingsRO.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connectionId is missing', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const connectionId = '';
        const tableName = faker.random.word();
        const findSettingsResponce = await request(app.getHttpServer())
          .get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findSettingsResponce.status).toBe(400);
        const findSettingsRO = JSON.parse(findSettingsResponce.text);
        expect(findSettingsRO.message).toBe(Messages.CONNECTION_ID_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should return an empty connection settings object, when setting does not exists for this table in connection', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const connectionId = JSON.parse(createdConnection.text).id;
        const tableName = faker.random.word();
        const findSettingsResponce = await request(app.getHttpServer())
          .get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(findSettingsResponce.status).toBe(200);
        const findSettingsRO = JSON.parse(findSettingsResponce.text);
        expect(findSettingsRO).toStrictEqual({});
      } catch (err) {
        throw err;
      }
    });

    it('should return connection settings object', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(201);

        const findSettingsResponce = await request(app.getHttpServer())
          .get(`/settings/?connectionId=${connectionId}&tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const findSettingsRO = JSON.parse(findSettingsResponce.text);
        expect(findSettingsRO.hasOwnProperty('id')).toBeTruthy();
        expect(findSettingsRO.table_name).toBe('connection');
        expect(findSettingsRO.display_name).toBe(createTableSettingsDTO.display_name);
        expect(findSettingsRO.search_fields).toStrictEqual(['title']);
        expect(findSettingsRO.excluded_fields).toStrictEqual([]);
        expect(findSettingsRO.list_fields).toStrictEqual([]);
        expect(findSettingsRO.list_per_page).toBe(3);
        expect(findSettingsRO.ordering).toBe('DESC');
        expect(findSettingsRO.ordering_field).toBe('port');
        expect(findSettingsRO.readonly_fields).toStrictEqual([]);
        expect(findSettingsRO.sortable_by).toStrictEqual([]);
        expect(findSettingsRO.autocomplete_columns).toStrictEqual([]);
        expect(findSettingsRO.identification_fields).toStrictEqual([]);
        expect(findSettingsRO.connection_id).toBe(connectionId);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('POST /settings/', () => {
    it('should return created table settings', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(201);

        const findSettingsResponce = await request(app.getHttpServer())
          .get(`/settings/?connectionId=${connectionId}&tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        const findSettingsRO = JSON.parse(findSettingsResponce.text);
        expect(findSettingsRO.hasOwnProperty('id')).toBeTruthy();
        expect(findSettingsRO.table_name).toBe('connection');
        expect(findSettingsRO.display_name).toBe(createTableSettingsDTO.display_name);
        expect(findSettingsRO.search_fields).toStrictEqual(['title']);
        expect(findSettingsRO.excluded_fields).toStrictEqual([]);
        expect(findSettingsRO.list_fields).toStrictEqual([]);
        expect(findSettingsRO.list_per_page).toBe(3);
        expect(findSettingsRO.ordering).toBe('DESC');
        expect(findSettingsRO.ordering_field).toBe('port');
        expect(findSettingsRO.readonly_fields).toStrictEqual([]);
        expect(findSettingsRO.sortable_by).toStrictEqual([]);
        expect(findSettingsRO.autocomplete_columns).toStrictEqual([]);
        expect(findSettingsRO.connection_id).toBe(connectionId);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when tableName is missing', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when connectionId is missing', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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

        const tableName = faker.random.word(1);
        const createTableSettingsResponse = await request(app.getHttpServer())
          .post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
          .send(createTableSettingsDTO)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe(Messages.CONNECTION_ID_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when search_fields is not an array', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('The field "search_fields" must be an array');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when excluded_fields is not an array', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('The field "excluded_fields" must be an array');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when list_fields is not an array', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('The field "list_fields" must be an array');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when readonly_fields is not an array', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('The field "readonly_fields" must be an array');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when sortable_by is not an array', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('The field "sortable_by" must be an array');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when there are no such field in the table for searching', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('There are no such fields: testField - in the table "connection"');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when there are no such field in the table for excluding', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('There are no such fields: testField - in the table "connection"');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when there are no such field in the table for list', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('There are no such fields: testField - in the table "connection"');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when there are no such field in the table for read only', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('There are no such fields: testField - in the table "connection"');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when there are no such field in the table for sorting', async () => {
      try {
        const createdConnection = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnectionToTestDB)
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
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(createTableSettingsResponse.status).toBe(400);
        const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
        expect(createTableSettingsRO.message).toBe('There are no such fields: testField - in the table "connection"');
      } catch (err) {
        throw err;
      }
    });
  });
});
