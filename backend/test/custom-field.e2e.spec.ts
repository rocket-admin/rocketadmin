import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import * as faker from 'faker';
import * as request from 'supertest';

import { ApplicationModule } from '../src/app.module';
import { Connection } from 'typeorm';
import { DaoPostgres } from '../src/dal/dao/dao-postgres';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { Encryptor } from '../src/helpers/encryption/encryptor';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { replaceTextInCurlies } from '../src/helpers';
import { Test } from '@nestjs/testing';
import { TestUtils } from './utils/test.utils';

describe('Custom fields(e2e)', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnection2;
  let decryptValue;
  let decryptValueMaterPwd;
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
      console.error('After all custom field error: ' + e);
    }
  });

  afterEach(async () => {
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
    await DaoPostgres.clearKnexCache();
    AWSMock.restore('CognitoIdentityServiceProvider');
  });

  describe('GET /fields/:slug', () => {
    it('should return empty array, when custom fields not created', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const getCustomFieldsRO = JSON.parse(getCustomFields.text);
        expect(getCustomFields.status).toBe(200);
        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });

    it('should return array of custom fields for table', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');

        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);
        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
        expect(getTableRowsRO.rows.length).toBe(5);
        for (const row of getTableRowsRO.rows) {
          expect(row.hasOwnProperty('#autoadmin:customFields')).toBeTruthy();
          expect(typeof row['#autoadmin:customFields']).toBe('object');
          expect(row['#autoadmin:customFields'].length).toBe(1);
          expect(row['#autoadmin:customFields'][0].type).toBe(newCustomField.type);
          expect(row['#autoadmin:customFields'][0].text).toBe(newCustomField.text);
          const urlTemplate = replaceTextInCurlies(
            newCustomField.template_string,
            ['id', 'title'],
            [row.id, row.title],
          );
          expect(row['#autoadmin:customFields'][0].url_template).toBe(urlTemplate);
        }
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(201);
        createConnectionRO.id = '';
        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(404);
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        createConnectionRO.id = faker.random.uuid();
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(403);
        expect(createCustomField.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const tableName = faker.random.word(2);
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=${tableName}`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.TABLE_NOT_FOUND);
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('POST /fields/:slug', () => {
    it('should return table settings with created custom field', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when custom field without text field passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        delete newCustomField.text;
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.CUSTOM_FIELD_TEXT_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when custom field without type field passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        delete newCustomField.type;
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.CUSTOM_FIELD_TYPE_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when custom field without template_string field passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        delete newCustomField.template_string;
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.CUSTOM_FIELD_TEMPLATE_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception when custom field with incorrect type passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        newCustomField.type = 'test';
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.CUSTOM_FIELD_TYPE_INCORRECT);
      } catch (err) {
        throw err;
      }
    });

    it('should throw complex exception when custom field with incorrect type and without text property passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        newCustomField.type = 'test';
        delete newCustomField.text;
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(
          `${Messages.CUSTOM_FIELD_TEXT_MISSING}, ${Messages.CUSTOM_FIELD_TYPE_INCORRECT}`,
        );
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        createConnectionRO.id = '';
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(404);
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        createConnectionRO.id = faker.random.uuid();
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(403);
        expect(createCustomField.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const tableName = faker.random.word(2);
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=${tableName}`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.TABLE_NOT_FOUND);
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
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);

        expect(createCustomFieldResponse.status).toBe(400);
        expect(createCustomField.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('PUT /fields/:slug', () => {
    it('should return updated custom field', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const updateDTO = {
          id: getCustomFieldsRO[0].id,
          type: getCustomFieldsRO[0].type,
          text: 'updated',
          template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
        };
        const updateCustomFieldResponse = await request(app.getHttpServer())
          .put(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(updateDTO)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(updateCustomFieldResponse.status).toBe(200);
        const updateCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(uuidRegex.test(updateCustomFieldRO.id)).toBeTruthy();
        expect(updateCustomFieldRO.type).toBe(updateDTO.type);
        expect(updateCustomFieldRO.template_string).toBe(updateDTO.template_string);
        expect(updateCustomFieldRO.text).toBe(updateDTO.text);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when connection id not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(updateCustomFieldResponse.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when connection id passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const updateDTO = {
          id: getCustomFieldsRO[0].id,
          type: getCustomFieldsRO[0].type,
          text: 'updated',
          template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
        };
        createConnectionRO.id = faker.random.uuid();
        const updateCustomFieldResponse = await request(app.getHttpServer())
          .put(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(updateDTO)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(403);
        expect(updatedCustomFieldRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when tableName passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const updateDTO = {
          id: getCustomFieldsRO[0].id,
          type: getCustomFieldsRO[0].type,
          text: 'updated',
          template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
        };
        const tableName = faker.random.word();
        const updateCustomFieldResponse = await request(app.getHttpServer())
          .put(`/field/${createConnectionRO.id}?tableName=${tableName}`)
          .send(updateDTO)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(Messages.TABLE_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when tableName not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when field id not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(Messages.CUSTOM_FIELD_ID_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when field type not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(Messages.CUSTOM_FIELD_TYPE_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when field type passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const updateDTO = {
          id: getCustomFieldsRO[0].id,
          type: faker.random.word(),
          text: 'updated',
          template_string: 'https//?connectionId={{id}}&connectionType={{type}}',
        };
        const updateCustomFieldResponse = await request(app.getHttpServer())
          .put(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(updateDTO)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(Messages.CUSTOM_FIELD_TYPE_INCORRECT);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when field text is not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(Messages.CUSTOM_FIELD_TEXT_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when field template_string is not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(Messages.CUSTOM_FIELD_TEMPLATE_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when fields passed in template string are incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const randomField1 = faker.random.word();
        const randomField2 = faker.random.word();
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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(
          `${Messages.EXCLUDED_OR_NOT_EXISTS(randomField1)}, ${Messages.EXCLUDED_OR_NOT_EXISTS(randomField2)}`,
        );
      } catch (err) {
        throw err;
      }
    });

    it('should throw complex exception, when some required fields not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

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
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const updatedCustomFieldRO = JSON.parse(updateCustomFieldResponse.text);
        expect(updateCustomFieldResponse.status).toBe(400);
        expect(updatedCustomFieldRO.message).toBe(
          `${Messages.CUSTOM_FIELD_TYPE_MISSING}, ${Messages.CUSTOM_FIELD_TEMPLATE_MISSING}`,
        );
      } catch (err) {
        throw err;
      }
    });
  });

  describe('DELETE /fields/:slug', () => {
    it('should return table settings without deleted custom field', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        let getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        let getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const deleteCustomField = await request(app.getHttpServer())
          .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(deleteCustomField.status).toBe(200);
        const deleteCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(deleteCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(deleteCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(deleteCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(deleteCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when connection id not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        createConnectionRO.id = '';
        const deleteCustomField = await request(app.getHttpServer())
          .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(deleteCustomField.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when connection id passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        createConnectionRO.id = faker.random.uuid();
        const deleteCustomField = await request(app.getHttpServer())
          .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(deleteCustomField.status).toBe(403);
        const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
        expect(deleteCustomFieldsRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when tableName not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const deleteCustomField = await request(app.getHttpServer())
          .delete(`/field/${createConnectionRO.id}?tableName=&id=${getCustomFieldsRO[0].id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(deleteCustomField.status).toBe(400);
        const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
        expect(deleteCustomFieldsRO.message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when tableName passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        const tableName = faker.random.word();
        const deleteCustomField = await request(app.getHttpServer())
          .delete(`/field/${createConnectionRO.id}?tableName=${tableName}&id=${getCustomFieldsRO[0].id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(deleteCustomField.status).toBe(400);
        const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
        expect(deleteCustomFieldsRO.message).toBe(Messages.TABLE_SETTINGS_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when field id is not passed in request', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        getCustomFieldsRO[0].id = '';
        const deleteCustomField = await request(app.getHttpServer())
          .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(deleteCustomField.status).toBe(400);
        const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
        expect(deleteCustomFieldsRO.message).toBe(Messages.PARAMETER_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw exception, when field id passed in request is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);
        const newCustomField = mockFactory.generateCustomFieldForConnectionTable('id', 'title');
        const createCustomFieldResponse = await request(app.getHttpServer())
          .post(`/field/${createConnectionRO.id}?tableName=connection`)
          .send(newCustomField)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createCustomField = JSON.parse(createCustomFieldResponse.text);
        expect(createCustomFieldResponse.status).toBe(201);
        expect(createCustomField.hasOwnProperty('custom_fields')).toBeTruthy();
        expect(typeof createCustomField.custom_fields).toBe('object');

        const getCustomFields = await request(app.getHttpServer())
          .get(`/fields/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getCustomFields.status).toBe(200);
        const getCustomFieldsRO = JSON.parse(getCustomFields.text);

        expect(typeof getCustomFieldsRO).toBe('object');
        expect(getCustomFieldsRO.length).toBe(1);
        expect(uuidRegex.test(getCustomFieldsRO[0].id)).toBeTruthy();
        expect(getCustomFieldsRO[0].type).toBe(newCustomField.type);
        expect(getCustomFieldsRO[0].text).toBe(newCustomField.text);
        expect(getCustomFieldsRO[0].template_string).toBe('https//?connectionId={{id}}&connectionTitle={{title}}');

        getCustomFieldsRO[0].id = faker.random.uuid();
        const deleteCustomField = await request(app.getHttpServer())
          .delete(`/field/${createConnectionRO.id}?tableName=connection&id=${getCustomFieldsRO[0].id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(deleteCustomField.status).toBe(400);
        const deleteCustomFieldsRO = JSON.parse(deleteCustomField.text);
        expect(deleteCustomFieldsRO.message).toBe(Messages.CUSTOM_FIELD_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });
  });
});
