import { faker } from '@faker-js/faker';
import * as request from 'supertest';

import { ApplicationModule } from '../../src/app.module';
import { Connection } from 'typeorm';
import { DatabaseModule } from '../../src/shared/database/database.module';
import { DatabaseService } from '../../src/shared/database/database.service';
import { Encryptor } from '../../src/helpers/encryption/encryptor';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../../src/exceptions/text/messages';
import { MockFactory } from '../mock.factory';
import { QueryOrderingEnum } from '../../src/enums';
import { Test } from '@nestjs/testing';
import { TestUtils } from '../utils/test.utils';
import { Cacher } from '../../src/helpers/cache/cacher';

describe('Tables with encryption (e2e)', () => {
  jest.setTimeout(10000);
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
    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse.status).toBe(200);
  });

  beforeAll(() => {
    jest.setTimeout(10000);
  });

  afterAll(async () => {
    try {
      await Cacher.clearAllCache();
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      const connect = await app.get(Connection);
      if (connect.isConnected) {
        await connect.close();
      }
    } catch (e) {
      console.error('After all pg internal encrypted error: ' + e);
    }
  });

  afterEach(async () => {
    await Cacher.clearAllCache();
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
  });

  describe('GET /connection/tables/:slug', () => {
    it('should return list of tables in connection', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const getTablesResponse = await request(app.getHttpServer())
          .get(`/connection/tables/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTablesResponse.status).toBe(200);
        const getTablesRO = JSON.parse(getTablesResponse.text);

        expect(typeof getTablesRO).toBe('object');
        expect(getTablesRO.length).toBe(23);
        // expect(getTablesRO[6].hasOwnProperty('agent')).toBeTruthy();
        expect(getTablesRO[5].hasOwnProperty('permissions')).toBeTruthy();
        expect(typeof getTablesRO[7].permissions).toBe('object');
        expect(Object.keys(getTablesRO[1].permissions).length).toBe(5);
        expect(getTablesRO[0].table).toBe('agent');
        expect(getTablesRO[1].permissions.visibility).toBe(true);
        expect(getTablesRO[2].permissions.readonly).toBe(false);
        expect(getTablesRO[3].permissions.add).toBe(true);
        expect(getTablesRO[4].permissions.delete).toBe(true);
        expect(getTablesRO[5].permissions.edit).toBe(true);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when connectionId not passed in request', async () => {
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
        const getTablesResponse = await request(app.getHttpServer())
          .get(`/connection/tables/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTablesResponse.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an error when connection id is incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = faker.datatype.uuid();
        const getTablesResponse = await request(app.getHttpServer())
          .get(`/connection/tables/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTablesResponse.status).toBe(400);
        const { message } = JSON.parse(getTablesResponse.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('GET /table/rows/:slug', () => {
    describe('without search and without pagination and without sorting', () => {
      it('should return rows of selected table without search and without pagination', async () => {
        try {
          const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(connectionCount + 5);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);
          expect(getTableRowsRO.rows[2].hasOwnProperty('title')).toBeTruthy();
          expect(getTableRowsRO.rows[3].hasOwnProperty('type')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('port')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('username')).toBeTruthy();
          expect(getTableRowsRO.rows[2].hasOwnProperty('password')).toBeTruthy();
          expect(getTableRowsRO.rows[3].hasOwnProperty('database')).toBeTruthy();
          expect(getTableRowsRO.rows[4].hasOwnProperty('sid')).toBeTruthy();

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id not passed in request', async () => {
        try {
          const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is incorrect', async () => {
        try {
          const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);

          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });
    });

    describe('with search, without pagination and without sorting', () => {
      it('should return rows of selected table with search and without pagination', async () => {
        try {
          const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(24);
          expect(getTableRowsRO.rows[0].title).toBe(newConnection2.title);
          expect(getTableRowsRO.rows[0].type).toBe(newConnection2.type);
          expect(decryptValue(getTableRowsRO.rows[0].host)).toBe(newConnection2.host);
          expect(getTableRowsRO.rows[0].port).toBe(newConnection2.port);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[0].username))).toBe(newConnection2.username);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[0].password))).toBe(newConnection2.password);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[0].database))).toBe(newConnection2.database);
          expect(getTableRowsRO.rows[0].sid).toBe(null);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an error when connectionId is not passed in request', async () => {
        try {
          const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an error when connectionId passed in request is incorrect', async () => {
        try {
          const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should return empty array when nothing was found', async () => {
        try {
          const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const search = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&search=${search}`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(0);
          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when tableName passed in request is incorrect', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const randomTableName = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${randomTableName}&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });
    });

    describe('without search, with pagination, without sorting', () => {
      it('should return page of all rows with pagination page=1, perPage=2', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);
          expect(getTableRowsRO.rows[0].hasOwnProperty('title')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('type')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('host')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('port')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('username')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('password')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('database')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('sid')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('schema')).toBeTruthy();

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          expect(getTableRowsRO.primaryColumns[0].data_type).toBe('uuid');

          expect(getTableRowsRO.pagination.total).toBe(17);
          expect(getTableRowsRO.pagination.lastPage).toBe(9);
          expect(getTableRowsRO.pagination.perPage).toBe(2);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
        } catch (err) {
          throw err;
        }
      });

      it('should return page of all rows with pagination page=3, perPage=2', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=3&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);
          expect(getTableRowsRO.rows[0].hasOwnProperty('title')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('type')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('host')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('port')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('username')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('password')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('database')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('sid')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('schema')).toBeTruthy();

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          expect(getTableRowsRO.primaryColumns[0].data_type).toBe('uuid');

          expect(getTableRowsRO.pagination.total).toBe(17);
          expect(getTableRowsRO.pagination.lastPage).toBe(9);
          expect(getTableRowsRO.pagination.perPage).toBe(2);
          expect(getTableRowsRO.pagination.currentPage).toBe(3);
        } catch (err) {
          throw err;
        }
      });

      it('should return empty rows arrays when page number is incorrect', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=100&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(0);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          expect(getTableRowsRO.primaryColumns[0].data_type).toBe('uuid');

          expect(getTableRowsRO.pagination.total).toBe(17);
          expect(getTableRowsRO.pagination.lastPage).toBe(9);
          expect(getTableRowsRO.pagination.perPage).toBe(2);
          expect(getTableRowsRO.pagination.currentPage).toBe(100);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when tableName passed in request is incorrect', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const randomTableName = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${randomTableName}&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connectionId not passed in request', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connectionId passed in request is incorrect', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });
    });

    describe('with search, with pagination, without sorting', () => {
      it('should return all found rows with pagination page=1 perPage=2', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionResponse2;

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedDescription}&page=1&perPage=2`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);
          expect(getTableRowsRO.rows[0].title).toBe(newConnection2.title);
          expect(getTableRowsRO.rows[1].type).toBe(newConnection2.type);
          expect(decryptValue(getTableRowsRO.rows[0].host)).toBe(newConnection2.host);
          expect(getTableRowsRO.rows[1].port).toBe(newConnection2.port);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[1].username))).toBe(newConnection2.username);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[0].password))).toBe(newConnection2.password);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[1].database))).toBe(newConnection2.database);
          expect(getTableRowsRO.rows[0].sid).toBe(null);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          expect(getTableRowsRO.primaryColumns[0].data_type).toBe('uuid');

          expect(getTableRowsRO.pagination.total).toBe(3);
          expect(getTableRowsRO.pagination.lastPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with pagination page=1 perPage=3', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionResponse2;

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedDescription}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(3);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);
          expect(getTableRowsRO.rows[0].title).toBe(newConnection2.title);
          expect(getTableRowsRO.rows[1].type).toBe(newConnection2.type);
          expect(decryptValue(getTableRowsRO.rows[0].host)).toBe(newConnection2.host);
          expect(getTableRowsRO.rows[1].port).toBe(newConnection2.port);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[1].username))).toBe(newConnection2.username);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[0].password))).toBe(newConnection2.password);
          expect(decryptValueMaterPwd(decryptValue(getTableRowsRO.rows[1].database))).toBe(newConnection2.database);
          expect(getTableRowsRO.rows[0].sid).toBe(null);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          expect(getTableRowsRO.primaryColumns[0].data_type).toBe('uuid');

          expect(getTableRowsRO.pagination.total).toBe(3);
          expect(getTableRowsRO.pagination.lastPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(3);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an exception when connection id is not passed in request', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionResponse2;

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedDescription}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionResponse2;

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedDescription}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an exception when tableName passed in request is incorrect', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionResponse2;

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&search=${searchedDescription}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an exception when tableName not passed in request', async () => {
        try {
          const connectionCount = 12;
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionResponse2;

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse2.status).toBe(201);

          createConnectionResponse2 = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection2)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          expect(createConnectionResponse2.status).toBe(201);
          expect(createConnectionResponse2.status).toBe(201);
          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&search=${searchedDescription}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.TABLE_NAME_MISSING);
        } catch (err) {
          throw err;
        }
      });
    });

    describe('without search and without pagination and with sorting', () => {
      it('should return all found rows with sorting ports by DESC', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            connectionCount + 5,
            QueryOrderingEnum.DESC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(connectionCount + 5);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(5432);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with sorting ports by ASC', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            connectionCount + 5,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(connectionCount + 5);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          for (let i = 0; i < 10; i++) {
            expect(getTableRowsRO.rows[i].port).toBe(10 + i);
          }
          expect(getTableRowsRO.rows[10].port).toBe(5432);
          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is not passed in request', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection passed in request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when tableName is not passed in the request', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.TABLE_NAME_MISSING);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when tableName passed in the request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });
    });

    describe('without search and with pagination and with sorting', () => {
      it('should return all found rows with sorting ports by DESC and with pagination page=1, perPage=2', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(5432);
          expect(getTableRowsRO.rows[1].port).toBe(5432);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with sorting ports by ASC and with pagination page=1, perPage=2', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(10);
          expect(getTableRowsRO.rows[1].port).toBe(11);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with sorting ports by DESC and with pagination page=2, perPage=3', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(3);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(5432);
          expect(getTableRowsRO.rows[1].port).toBe(5432);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is not passed in request', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);

          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when table name passed request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);

          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });
    });

    describe('with search, with pagination and with sorting', () => {
      it('should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(8080);
          expect(getTableRowsRO.rows[1].port).toBe(8079);

          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=2&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(8078);

          expect(getTableRowsRO.pagination.currentPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=1, perPage=2 and ASC sorting', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(8078);
          expect(getTableRowsRO.rows[1].port).toBe(8079);

          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=2, perPage=2 and ASC sorting', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=2&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(8080);

          expect(getTableRowsRO.pagination.currentPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id not passed in request', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=2&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=2&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when tableName not passed in the request', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&page=2&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.TABLE_NAME_MISSING);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when tableName passed in the request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['title'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'port',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&page=2&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should return an empty array when nothing was found ', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const searchedDescription = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(0);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return an empty array when current page is incorrect (larger then last page)', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          let createConnectionRO2;
          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
            createConnectionRO2 = JSON.parse(createConnectionResponse2.text);
          }

          const searchedDescription = createConnectionRO2.title;

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&page=100&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(0);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });
    });

    describe('with search, with pagination, with sorting and with filtering', () => {
      it('should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting and filtering', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'port';
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedFieldValue}&page=1&perPage=2&f_${fieldname}__lt=${fieldvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(14);
          expect(getTableRowsRO.rows[1].port).toBe(13);
          expect(getTableRowsRO.rows[0].title).toBe(searchedFieldValue);
          expect(getTableRowsRO.rows[1].title).toBe(searchedFieldValue);

          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=1, perPage=10 and DESC sorting and filtering', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'port';
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedFieldValue}&page=1&perPage=10&f_${fieldname}__lt=${fieldvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(5);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(14);
          expect(getTableRowsRO.rows[1].port).toBe(13);
          expect(getTableRowsRO.rows[0].title).toBe(searchedFieldValue);
          expect(getTableRowsRO.rows[1].title).toBe(searchedFieldValue);
          expect(getTableRowsRO.rows[2].title).toBe(searchedFieldValue);
          expect(getTableRowsRO.rows[3].title).toBe(searchedFieldValue);
          expect(getTableRowsRO.rows[4].title).toBe(searchedFieldValue);

          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(10);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting and filtering', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'port';
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedFieldValue}&page=2&perPage=2&f_${fieldname}__lt=${fieldvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(12);
          expect(getTableRowsRO.rows[1].port).toBe(11);
          expect(getTableRowsRO.rows[0].title).toBe(searchedFieldValue);
          expect(getTableRowsRO.rows[1].title).toBe(searchedFieldValue);

          expect(getTableRowsRO.pagination.currentPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting and with multi filtering', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'port';
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedFieldValue}&page=2&perPage=2&f_${fieldname}__lt=${fieldvalue}&&f_type__contains=post`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(uuidRegex.test(getTableRowsRO.rows[0].id)).toBeTruthy();
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(24);

          expect(getTableRowsRO.rows[0].port).toBe(12);
          expect(getTableRowsRO.rows[1].port).toBe(11);
          expect(getTableRowsRO.rows[0].title).toBe(searchedFieldValue);
          expect(getTableRowsRO.rows[1].title).toBe(searchedFieldValue);

          expect(getTableRowsRO.pagination.currentPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is not passed in request', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'port';
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/$?tableName=connection&search=${searchedFieldValue}&page=2&perPage=2&f_${fieldname}__lt=${fieldvalue}&&f_database__contains=nest`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);

          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.CONNECTION_ID_MISSING);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'port';
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          createConnectionRO.id = faker.datatype.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=connection&search=${searchedFieldValue}&page=2&perPage=2&f_${fieldname}__lt=${fieldvalue}&&f_database__contains=nest`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);

          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when table name passed in request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'port';
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          const tableName = faker.random.words(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${tableName}&search=${searchedFieldValue}&page=2&perPage=2&f_${fieldname}__lt=${fieldvalue}&&f_database__contains=nest`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);

          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should return an empty array when filtered name name passed in request is incorrect', async () => {
        try {
          const realConnection = JSON.parse(JSON.stringify(newConnection));
          const connectionCount = 10;
          for (let i = 0; i < connectionCount; i++) {
            newConnection.port = 10 + i;
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(realConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          for (let i = 0; i < 3; i++) {
            newConnection2.port = 8080 - i;
            const createConnectionResponse2 = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection2)
              .set('Content-Type', 'application/json')
              .set('masterpwd', 'ahalaimahalai')
              .set('Accept', 'application/json');
            expect(createConnectionResponse2.status).toBe(201);
          }

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=connection`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');

          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = faker.random.words(1);
          const fieldvalue = '15';
          const searchedFieldValue = 'Test Internal Connection';
          const tableName = 'connection';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${tableName}&search=${searchedFieldValue}&page=1&perPage=2&f_${fieldname}__lt=${fieldvalue}&&f_database__contains=nest`,
            )
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTablesRO = JSON.parse(getTableRowsResponse.text);
          expect(getTablesRO.rows.length).toBe(0);
          expect(getTablesRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTablesRO.hasOwnProperty('pagination')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });
    });
  });

  describe('GET /table/structure/:slug', () => {
    it('should return found table structure', async () => {
      try {
        const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
        for (let i = 0; i < connectionCount; i++) {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse.status).toBe(201);
        }

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableStructure.status).toBe(200);
        const getTableStructureRO = JSON.parse(getTableStructure.text);

        expect(typeof getTableStructureRO).toBe('object');
        expect(typeof getTableStructureRO.structure).toBe('object');
        expect(getTableStructureRO.structure.length).toBe(24);

        for (const element of getTableStructureRO.structure) {
          expect(element.hasOwnProperty('column_name')).toBeTruthy();
          expect(element.hasOwnProperty('column_default')).toBeTruthy();
          expect(element.hasOwnProperty('data_type')).toBeTruthy();
          expect(element.hasOwnProperty('isExcluded')).toBeTruthy();
          expect(element.hasOwnProperty('isSearched')).toBeTruthy();
        }

        expect(getTableStructureRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableStructureRO.hasOwnProperty('foreignKeys')).toBeTruthy();

        for (const element of getTableStructureRO.primaryColumns) {
          expect(element.hasOwnProperty('column_name')).toBeTruthy();
          expect(element.hasOwnProperty('data_type')).toBeTruthy();
        }

        for (const element of getTableStructureRO.foreignKeys) {
          expect(element.hasOwnProperty('referenced_column_name')).toBeTruthy();
          expect(element.hasOwnProperty('referenced_table_name')).toBeTruthy();
          expect(element.hasOwnProperty('constraint_name')).toBeTruthy();
          expect(element.hasOwnProperty('column_name')).toBeTruthy();
        }
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception whe connection id not passed in request', async () => {
      try {
        const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
        for (let i = 0; i < connectionCount; i++) {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse.status).toBe(201);
        }

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = '';
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableStructure.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception whe connection id passed in request id incorrect', async () => {
      try {
        const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
        for (let i = 0; i < connectionCount; i++) {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse.status).toBe(201);
        }

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = faker.datatype.uuid();
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=connection`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableStructure.status).toBe(400);
        const { message } = JSON.parse(getTableStructure.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when tableName not passed in request', async () => {
      try {
        const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
        for (let i = 0; i < connectionCount; i++) {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse.status).toBe(201);
        }

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const tableName = '';
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=${tableName}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableStructure.status).toBe(400);
        const { message } = JSON.parse(getTableStructure.text);
        expect(message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when tableName passed in request is incorrect', async () => {
      try {
        const connectionCount = faker.datatype.number({ min: 5, max: 15, precision: 1 });
        for (let i = 0; i < connectionCount; i++) {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('masterpwd', 'ahalaimahalai')
            .set('Accept', 'application/json');
          expect(createConnectionResponse.status).toBe(201);
        }

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const tableName = faker.random.words(1);
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=${tableName}`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableStructure.status).toBe(400);
        const { message } = JSON.parse(getTableStructure.text);
        expect(message).toBe(Messages.TABLE_NOT_FOUND);
      } catch (err) {
        throw err;
      }
    });
  });

  describe('POST /table/row/:slug', () => {
    it('should add row in table and return result', async () => {
      try {
        const realConnection = JSON.parse(JSON.stringify(newConnection));

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(realConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fake_id = faker.datatype.uuid();

        const row = {
          job_key: fake_id,
        };

        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=job_list`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const addRowInTableRO = JSON.parse(addRowInTableResponse.text);
        expect(addRowInTableResponse.status).toBe(201);
        expect(addRowInTableRO.hasOwnProperty('row')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('structure')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('foreignKeys')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('readonly_fields')).toBeTruthy();
        expect(addRowInTableRO.row.job_key).toBe(row.job_key);

        //checking that the line was added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=job_list`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows } = getTableRowsRO;

        expect(rows.length).toBe(1);
        expect(rows[0].job_key).toBe(fake_id);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when connection id is not passed in request', async () => {
      try {
        const realConnection = JSON.parse(JSON.stringify(newConnection));

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(realConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fake_id = faker.datatype.uuid();

        const row = {
          job_key: fake_id,
        };

        const emptyId = '';
        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${emptyId}?tableName=jobs_list`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(404);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=job_list`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsResponse.status).toBe(200);
        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows } = getTableRowsRO;

        expect(rows.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when table name is not passed in request', async () => {
      try {
        const realConnection = JSON.parse(JSON.stringify(newConnection));

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(realConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fake_id = faker.datatype.uuid();

        const row = {
          job_key: fake_id,
        };

        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(addRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NAME_MISSING);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=job_list`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows } = getTableRowsRO;

        expect(rows.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when row is not passed in request', async () => {
      try {
        const realConnection = JSON.parse(JSON.stringify(newConnection));

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(realConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=job_list`)
          .set('masterpwd', 'ahalaimahalai')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(addRowInTableResponse.text);
        expect(message).toBe(Messages.PARAMETER_MISSING);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=job_list`)
          .set('masterpwd', 'ahalaimahalai')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows } = getTableRowsRO;

        expect(rows.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when table name passed in request is incorrect', async () => {
      try {
        const realConnection = JSON.parse(JSON.stringify(newConnection));

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(realConnection)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeIntegerField = faker.datatype.number({ min: 5, max: 10, precision: 1 });
        const fakeTextField = faker.random.words(faker.datatype.number({ min: 5, max: 10, precision: 1 }));
        const fakeBooleanField = faker.datatype.boolean();

        const row = {
          integerField: fakeIntegerField,
          textField: fakeTextField,
          booleanField: fakeBooleanField,
        };

        const fakeTableName = faker.random.words(1);
        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(addRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NOT_FOUND);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=job_list`)
          .set('Content-Type', 'application/json')
          .set('masterpwd', 'ahalaimahalai')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows } = getTableRowsRO;

        expect(rows.length).toBe(0);
      } catch (err) {
        throw err;
      }
    });

    //******
  });

  //********************************************************************************************
});
