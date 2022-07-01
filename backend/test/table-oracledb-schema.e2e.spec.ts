import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import * as faker from 'faker';
import { knex } from 'knex';
import * as request from 'supertest';

import { ApplicationModule } from '../src/app.module';
import { Connection } from 'typeorm';
import { Constants } from '../src/helpers/constants/constants';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { Messages } from '../src/exceptions/text/messages';
import { MockFactory } from './mock.factory';
import { QueryOrderingEnum } from '../src/enums';
import { Test } from '@nestjs/testing';
import { TestUtils } from './utils/test.utils';
import { Cacher } from '../src/helpers/cache/cacher';

describe('Tables OracleDB With Schema(e2e)', () => {
  jest.setTimeout(10000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection, newAdminConnection;
  const testTableName = 'users';
  const testTableColumnName = 'name';
  const testTAbleSecondColumnName = 'email';
  const testSearchedUserName = 'Vasia';
  const testEntitiesSeedsCount = 42;

  async function resetOracleTestDB() {
    const { host, username, password, database, port, type, ssl, cert, sid } = newAdminConnection;
    const Knex = knex({
      client: type,
      connection: {
        user: username,
        database: database,
        password: password,
        connectString: `${host}:${port}/${sid ? sid : ''}`,
        ssl: ssl ? { ca: cert } : { rejectUnauthorized: false },
      },
    });

    await Knex.schema.dropTableIfExists(testTableName.toUpperCase());
    await Knex.schema.dropTableIfExists(testTableName);
    await Knex.schema.createTableIfNotExists(testTableName, function (table) {
      table.increments();
      table.string(testTableColumnName);
      table.string(testTAbleSecondColumnName);
      table.timestamps();
    });

    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName)
          .withSchema(username.toUpperCase())
          .insert({
            [testTableColumnName]: testSearchedUserName,
            [testTAbleSecondColumnName]: faker.internet.email(),
            created_at: new Date(),
            updated_at: new Date(),
          });
      } else {
        await Knex(testTableName).insert({
          [testTableColumnName]: faker.name.findName(),
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    await Knex.destroy();
  }

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();

    testUtils = moduleFixture.get<TestUtils>(TestUtils);
    await testUtils.resetDb();
    app = moduleFixture.createNestApplication();
    await app.init();

    newConnection = mockFactory.generateConnectionToSchemaOracleDBInDocker();
    newAdminConnection = mockFactory.generateConnectionToTestOracleDBInDocker();
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
    await resetOracleTestDB();
    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse.status).toBe(200);
  });

  afterEach(async () => {
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
    AWSMock.restore('CognitoIdentityServiceProvider');
  });

  beforeAll(() => {
    jest.setTimeout(100000);
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
      await app.close();
    } catch (e) {
      console.error('After all test oracle schema error: ' + e);
    }
  });

  describe('GET /connection/tables/:slug', () => {
    it('should return list of tables in connection', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const getTablesResponse = await request(app.getHttpServer())
          .get(`/connection/tables/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTablesResponse.status).toBe(200);
        const getTablesRO = JSON.parse(getTablesResponse.text);

        expect(typeof getTablesRO).toBe('object');
        expect(getTablesRO.length).toBe(135);
        expect(getTablesRO[0].hasOwnProperty('table')).toBeTruthy();
        expect(getTablesRO[0].hasOwnProperty('permissions')).toBeTruthy();
        expect(typeof getTablesRO[0].permissions).toBe('object');
        expect(Object.keys(getTablesRO[0].permissions).length).toBe(5);
        const testTableIndex = getTablesRO.findIndex((table) => {
          return table.table === testTableName;
        });
        expect(getTablesRO[testTableIndex].table).toBe(testTableName);
        expect(getTablesRO[testTableIndex].permissions.visibility).toBe(true);
        expect(getTablesRO[testTableIndex].permissions.readonly).toBe(false);
        expect(getTablesRO[testTableIndex].permissions.add).toBe(true);
        expect(getTablesRO[testTableIndex].permissions.delete).toBe(true);
        expect(getTablesRO[testTableIndex].permissions.edit).toBe(true);
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
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = '';
        const getTablesResponse = await request(app.getHttpServer())
          .get(`/connection/tables/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
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
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = faker.random.uuid();
        const getTablesResponse = await request(app.getHttpServer())
          .get(`/connection/tables/${createConnectionRO.id}`)
          .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(Constants.DEFAULT_PAGINATION.perPage);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].hasOwnProperty('id')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('name')).toBeTruthy();
          expect(getTableRowsRO.rows[10].hasOwnProperty('email')).toBeTruthy();
          expect(getTableRowsRO.rows[15].hasOwnProperty('created_at')).toBeTruthy();
          expect(getTableRowsRO.rows[19].hasOwnProperty('updated_at')).toBeTruthy();

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id not passed in request', async () => {
        try {
          const connectionCount = faker.random.number({ min: 5, max: 15 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is incorrect', async () => {
        try {
          const connectionCount = faker.random.number({ min: 5, max: 15 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          createConnectionRO.id = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);
          const searchedDescription = '5';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(parseInt(searchedDescription));
          expect(getTableRowsRO.rows[0].hasOwnProperty('name')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('email')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('created_at')).toBeTruthy();
          expect(getTableRowsRO.rows[0].hasOwnProperty('updated_at')).toBeTruthy();
          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an error when connectionId is not passed in request', async () => {
        try {
          const connectionCount = faker.random.number({ min: 5, max: 15 });
          for (let i = 0; i < connectionCount; i++) {
            const createConnectionResponse = await request(app.getHttpServer())
              .post('/connection')
              .send(newConnection)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);
          const searchedDescription = '5';
          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an error when connectionId passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);
          const searchedDescription = '5';
          createConnectionRO.id = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);
          const { message } = JSON.parse(getTableRowsResponse.text);
          expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      xit('should return empty array when nothing was found', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            'connection',
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const search = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${search}`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const randomTableName = faker.random.word(1);
          const searchedDescription = '5';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${randomTableName}&search=${searchedDescription}`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].hasOwnProperty('id')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('name')).toBeTruthy();

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          // expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          //  expect(getTableRowsRO.primaryColumns[0].data_type).toBe('int');

          expect(getTableRowsRO.pagination.total).toBe(42);
          expect(getTableRowsRO.pagination.lastPage).toBe(21);
          expect(getTableRowsRO.pagination.perPage).toBe(2);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
        } catch (err) {
          throw err;
        }
      });

      it('should return page of all rows with pagination page=3, perPage=2', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=3&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].hasOwnProperty('id')).toBeTruthy();
          expect(getTableRowsRO.rows[1].hasOwnProperty('name')).toBeTruthy();

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          // expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          //   expect(getTableRowsRO.primaryColumns[0].data_type).toBe('int');

          expect(getTableRowsRO.pagination.total).toBe(42);
          expect(getTableRowsRO.pagination.lastPage).toBe(21);
          expect(getTableRowsRO.pagination.perPage).toBe(2);
          expect(getTableRowsRO.pagination.currentPage).toBe(3);
        } catch (err) {
          throw err;
        }
      });

      it('should return empty rows array when page number is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=100&perPage=2`)
            .set('Content-Type', 'application/json')
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
          // expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          //  expect(getTableRowsRO.primaryColumns[0].data_type).toBe('int');

          // expect(getTableRowsRO.pagination.total).toBe(42);
          // expect(getTableRowsRO.pagination.lastPage).toBe(21);
          // expect(getTableRowsRO.pagination.perPage).toBe(2);
          // expect(getTableRowsRO.pagination.currentPage).toBe(100);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when tableName passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['id'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
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
              .set('Accept', 'application/json');
            expect(createConnectionResponse.status).toBe(201);
          }

          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          createConnectionRO.id = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=connection&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);
          expect(getTableRowsRO.rows[0].name).toBe(testSearchedUserName);
          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //   expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          //   expect(getTableRowsRO.primaryColumns[0].data_type).toBe('int');
          //todo rework pagination data in dao-oracledb
          expect(getTableRowsRO.pagination.total).toBe(42);
          expect(getTableRowsRO.pagination.lastPage).toBe(21);
          expect(getTableRowsRO.pagination.perPage).toBe(2);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with pagination page=1 perPage=3', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(3);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);
          expect(getTableRowsRO.rows[0].name).toBe(testSearchedUserName);
          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //  expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
          expect(getTableRowsRO.primaryColumns[0].column_name).toBe('id');
          // expect(getTableRowsRO.primaryColumns[0].data_type).toBe('int');
          //todo rework pagination data in dao-oracledb
          expect(getTableRowsRO.pagination.total).toBe(42);
          expect(getTableRowsRO.pagination.lastPage).toBe(14);
          expect(getTableRowsRO.pagination.perPage).toBe(3);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is not passed in request', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should return throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);
          createConnectionRO.id = faker.random.uuid();

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&search=${testSearchedUserName}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
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
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&search=${testSearchedUserName}&page=1&perPage=3`,
            )
            .set('Content-Type', 'application/json')
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
      it('should return all found rows with sorting ids by DESC', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
            undefined,
            undefined,
            42,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(42);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(42);
          expect(getTableRowsRO.rows[1].id).toBe(41);
          expect(getTableRowsRO.rows[41].id).toBe(1);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //   expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with sorting ids by ASC', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
            undefined,
            undefined,
            42,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(42);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(1);
          expect(getTableRowsRO.rows[1].id).toBe(2);
          expect(getTableRowsRO.rows[41].id).toBe(42);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //    expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is not passed in request', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);
          createConnectionRO.id = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            ['name'],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(42);
          expect(getTableRowsRO.rows[1].id).toBe(41);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //  expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with sorting ports by ASC and with pagination page=1, perPage=2', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(1);
          expect(getTableRowsRO.rows[1].id).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //  expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with sorting ports by DESC and with pagination page=2, perPage=3', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(3);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(39);
          expect(getTableRowsRO.rows[1].id).toBe(38);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //  expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is not passed in request', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&page=2&perPage=3`)
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(38);
          expect(getTableRowsRO.rows[1].id).toBe(22);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          // expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(1);
          expect(getTableRowsRO.pagination.currentPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          // expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=1, perPage=2 and ASC sorting', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(1);
          expect(getTableRowsRO.rows[1].id).toBe(22);
          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //   expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=2, perPage=2 and ASC sorting', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);
          expect(getTableRowsRO.rows[0].id).toBe(38);
          expect(getTableRowsRO.pagination.currentPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //  expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id not passed in request', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          createConnectionRO.id = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fakeTableName = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&page=2&perPage=2&search=${testSearchedUserName}`,
            )
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const searchedDescription = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=2&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
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
          //    expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return an empty array when current page is incorrect (larger then last page)', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.ASC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const searchedDescription = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=420&search=${searchedDescription}`,
            )
            .set('Content-Type', 'application/json')
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
          //   expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });
    });

    describe('with search, with pagination, with sorting and with filtering', () => {
      it('should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting and filtering', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'id';
          const fieldvalue = '45';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(2);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);

          expect(getTableRowsRO.rows[0].name).toBe(testSearchedUserName);
          expect(getTableRowsRO.rows[0].id).toBe(38);
          expect(getTableRowsRO.rows[1].name).toBe(testSearchedUserName);
          expect(getTableRowsRO.rows[1].id).toBe(22);

          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=1, perPage=10 and DESC sorting and filtering', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'ID';
          const fieldvalue = '41';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=10&f_${fieldname}__lt=${fieldvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(3);
          expect(Object.keys(getTableRowsRO.rows[1]).length).toBe(5);

          expect(getTableRowsRO.rows[0].name).toBe(testSearchedUserName);
          expect(getTableRowsRO.rows[0].id).toBe(38);
          expect(getTableRowsRO.rows[1].name).toBe(testSearchedUserName);
          expect(getTableRowsRO.rows[1].id).toBe(22);
          expect(getTableRowsRO.rows[2].name).toBe(testSearchedUserName);
          expect(getTableRowsRO.rows[2].id).toBe(1);

          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(10);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          // expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=2, perPage=2 and DESC sorting and filtering', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'ID';
          const fieldvalue = '41';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=2&perPage=2&f_${fieldname}__lt=${fieldvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);
          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);

          expect(getTableRowsRO.rows[0].name).toBe(testSearchedUserName);
          expect(getTableRowsRO.rows[0].id).toBe(1);

          expect(getTableRowsRO.pagination.currentPage).toBe(2);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
          //expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should return all found rows with search, pagination: page=1, perPage=2 and DESC sorting and with multi filtering', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'id';
          const fieldGtvalue = '25';
          const fieldLtvalue = '40';

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

          expect(typeof getTableRowsRO).toBe('object');
          expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
          expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();
          expect(getTableRowsRO.rows.length).toBe(1);
          expect(Object.keys(getTableRowsRO.rows[0]).length).toBe(5);

          expect(getTableRowsRO.rows[0].id).toBe(38);
          expect(getTableRowsRO.rows[0].name).toBe(testSearchedUserName);

          expect(getTableRowsRO.pagination.currentPage).toBe(1);
          expect(getTableRowsRO.pagination.perPage).toBe(2);

          expect(typeof getTableRowsRO.primaryColumns).toBe('object');
          expect(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name')).toBeTruthy();
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id is not passed in request', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'id';
          const fieldGtvalue = '25';
          const fieldLtvalue = '40';
          createConnectionRO.id = '';
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(404);
        } catch (err) {
          throw err;
        }
      });

      it('should throw an exception when connection id passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'id';
          const fieldGtvalue = '25';
          const fieldLtvalue = '40';

          createConnectionRO.id = faker.random.uuid();
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
            )
            .set('Content-Type', 'application/json')
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
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = 'id';
          const fieldGtvalue = '25';
          const fieldLtvalue = '40';

          const fakeTableName = faker.random.word(1);
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${fakeTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(400);

          const { message } = JSON.parse(getTableRowsResponse.text);

          expect(message).toBe(Messages.TABLE_NOT_FOUND);
        } catch (err) {
          throw err;
        }
      });

      it('should return an array with searched fields when filtered name passed in request is incorrect', async () => {
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);

          const createTableSettingsDTO = mockFactory.generateTableSettings(
            createConnectionRO.id,
            testTableName,
            [testTableColumnName],
            undefined,
            undefined,
            3,
            QueryOrderingEnum.DESC,
            'id',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          const createTableSettingsResponse = await request(app.getHttpServer())
            .post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
            .send(createTableSettingsDTO)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(createTableSettingsResponse.status).toBe(201);

          const fieldname = faker.random.word(1);
          const fieldGtvalue = '25';
          const fieldLtvalue = '40';

          const getTableRowsResponse = await request(app.getHttpServer())
            .get(
              `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=2&f_${fieldname}__lt=${fieldLtvalue}&f_${fieldname}__gt=${fieldGtvalue}`,
            )
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);

          const getTablesRO = JSON.parse(getTableRowsResponse.text);
          expect(getTablesRO.rows.length).toBe(2);
          expect(getTablesRO.rows[0].name).toBe(testSearchedUserName);
          expect(getTablesRO.rows[1].name).toBe(testSearchedUserName);
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
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=${testTableName}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableStructure.status).toBe(200);
        const getTableStructureRO = JSON.parse(getTableStructure.text);

        expect(typeof getTableStructureRO).toBe('object');
        expect(typeof getTableStructureRO.structure).toBe('object');
        expect(getTableStructureRO.structure.length).toBe(5);

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
          //   expect(element.hasOwnProperty('data_type')).toBeTruthy();
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
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = '';
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=${testTableName}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableStructure.status).toBe(404);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception whe connection id passed in request id incorrect', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        createConnectionRO.id = faker.random.uuid();
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=${testTableName}`)
          .set('Content-Type', 'application/json')
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
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const tableName = '';
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=${tableName}`)
          .set('Content-Type', 'application/json')
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
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const tableName = faker.random.word(1);
        const getTableStructure = await request(app.getHttpServer())
          .get(`/table/structure/${createConnectionRO.id}?tableName=${tableName}`)
          .set('Content-Type', 'application/json')
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          id: 43,
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(addRowInTableResponse.status).toBe(201);
        const addRowInTableRO = JSON.parse(addRowInTableResponse.text);

        expect(addRowInTableRO.hasOwnProperty('row')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('structure')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('foreignKeys')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(addRowInTableRO.hasOwnProperty('readonly_fields')).toBeTruthy();
        expect(addRowInTableRO.row[testTableColumnName]).toBe(row[testTableColumnName]);
        expect(addRowInTableRO.row[testTAbleSecondColumnName]).toBe(row[testTAbleSecondColumnName]);

        //checking that the line was added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(43);
        expect(rows[42][testTableColumnName]).toBe(row[testTableColumnName]);
        expect(rows[42][testTAbleSecondColumnName]).toBe(row[testTAbleSecondColumnName]);
        expect(rows[42].id).toBe(rows[41].id + 1);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when connection id is not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          id: 999,
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };
        const fakeConnectionId = '';
        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${fakeConnectionId}?tableName=${testTableName}`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(404);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when table name is not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          id: 999,
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(addRowInTableResponse.text);

        expect(message).toBe(Messages.TABLE_NAME_MISSING);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when row is not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(addRowInTableResponse.text);

        expect(message).toBe(Messages.PARAMETER_MISSING);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
      } catch (err) {
        throw err;
      }
    });

    it('should throw an exception when table name passed in request is incorrect', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          id: 999,
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const fakeTableName = faker.random.word(1);
        const addRowInTableResponse = await request(app.getHttpServer())
          .post(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(addRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(addRowInTableResponse.text);

        expect(message).toBe(Messages.TABLE_NOT_FOUND);

        //checking that the line wasn't added
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
      } catch (err) {
        throw err;
      }
    });

    //******
  });

  describe('PUT /table/row/:slug', () => {
    it('should update row in table and return result', async () => {
      try {
        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=1`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const updateRowInTableRO = JSON.parse(updateRowInTableResponse.text);
        expect(updateRowInTableResponse.status).toBe(200);
        // const updateRowInTableRO = JSON.parse(updateRowInTableResponse.text);

        expect(updateRowInTableRO.hasOwnProperty('row')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('structure')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('foreignKeys')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(updateRowInTableRO.hasOwnProperty('readonly_fields')).toBeTruthy();
        expect(updateRowInTableRO.row[testTableColumnName]).toBe(row[testTableColumnName]);
        expect(updateRowInTableRO.row[testTAbleSecondColumnName]).toBe(row[testTAbleSecondColumnName]);

        //checking that the line was updated
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        const updateRowIndex = rows.map((row) => row.id).indexOf(1);
        expect(rows.length).toBe(42);
        expect(rows[updateRowIndex][testTableColumnName]).toBe(row[testTableColumnName]);
        expect(rows[updateRowIndex][testTAbleSecondColumnName]).toBe(row[testTAbleSecondColumnName]);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when connection id not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        createConnectionRO.id = '';
        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=1`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(updateRowInTableResponse.status).toBe(404);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when connection id passed in request is incorrect', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        createConnectionRO.id = faker.random.uuid();
        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=1`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(updateRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(updateRowInTableResponse.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when tableName not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        createConnectionRO.id = faker.random.uuid();
        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=&id=1`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(updateRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(updateRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when tableName passed in request is incorrect', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const fakeTableName = faker.random.uuid();
        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=1`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(updateRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(updateRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NOT_FOUND);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when primary key not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(updateRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(updateRowInTableResponse.text);
        expect(message).toBe(Messages.PRIMARY_KEY_INVALID);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when primary key passed in request has incorrect field name', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&IncorrectField=1`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(updateRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(updateRowInTableResponse.text);
        expect(message).toBe(Messages.PRIMARY_KEY_INVALID);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    xit('should throw an exception when primary key passed in request has incorrect field value', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const fakeName = faker.name.findName();
        const fakeMail = faker.internet.email();

        const row = {
          [testTableColumnName]: fakeName,
          [testTAbleSecondColumnName]: fakeMail,
        };

        const updateRowInTableResponse = await request(app.getHttpServer())
          .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=100000000`)
          .send(JSON.stringify(row))
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(updateRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(updateRowInTableResponse.text);
        expect(message)
          .toBe(`${Messages.UPDATE_ROW_FAILED} ${Messages.ERROR_MESSAGE} "${Messages.ROW_PRIMARY_KEY_NOT_FOUND}"
         ${Messages.TRY_AGAIN_LATER}`);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });
  });

  describe('DELETE /table/row/:slug', () => {
    it('should delete row in table and return result', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForDeletion}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(200);
        const deleteRowInTableRO = JSON.parse(deleteRowInTableResponse.text);

        expect(deleteRowInTableRO.hasOwnProperty('row')).toBeTruthy();

        //checking that the line was deleted
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(41);
        const deletedRowIndex = rows.map((row) => row.id).indexOf(idForDeletion);
        expect(deletedRowIndex < 0).toBeTruthy();
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when connection id not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const connectionId = '';
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${connectionId}?tableName=${testTableName}&id=${idForDeletion}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(404);

        //checking that the line wasn't deleted
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
        const deletedRowIndex = rows.map((row) => row.id).indexOf(idForDeletion);
        expect(deletedRowIndex < 0).toBeFalsy();
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when connection id passed in request is incorrect', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const connectionId = faker.random.uuid();
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${connectionId}?tableName=${testTableName}&id=${idForDeletion}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(deleteRowInTableResponse.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);

        //checking that the line wasn't deleted
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
        const deletedRowIndex = rows.map((row) => row.id).indexOf(idForDeletion);
        expect(deletedRowIndex < 0).toBeFalsy();
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when tableName not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const fakeTableName = '';
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForDeletion}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(deleteRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NAME_MISSING);

        //checking that the line wasn't deleted
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
        const deletedRowIndex = rows.map((row) => row.id).indexOf(idForDeletion);
        expect(deletedRowIndex < 0).toBeFalsy();
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when tableName passed in request is incorrect', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const fakeTableName = faker.random.word(1);
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForDeletion}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(deleteRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NOT_FOUND);

        //checking that the line wasn't deleted
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
        const deletedRowIndex = rows.map((row) => row.id).indexOf(idForDeletion);
        expect(deletedRowIndex < 0).toBeFalsy();
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when primary key not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(deleteRowInTableResponse.text);
        expect(message).toBe(Messages.PRIMARY_KEY_INVALID);

        //checking that the line wasn't deleted
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
        const deletedRowIndex = rows.map((row) => row.id).indexOf(idForDeletion);
        expect(deletedRowIndex < 0).toBeFalsy();
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception when primary key passed in request has incorrect field name', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&fakePKey=1`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(deleteRowInTableResponse.text);
        expect(message).toBe(Messages.PRIMARY_KEY_INVALID);

        //checking that the line wasn't deleted
        const getTableRowsResponse = await request(app.getHttpServer())
          .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        expect(getTableRowsResponse.status).toBe(200);

        const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

        expect(getTableRowsRO.hasOwnProperty('rows')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(getTableRowsRO.hasOwnProperty('pagination')).toBeTruthy();

        const { rows, primaryColumns, pagination } = getTableRowsRO;

        expect(rows.length).toBe(42);
        const deletedRowIndex = rows.map((row) => row.id).indexOf(idForDeletion);
        expect(deletedRowIndex < 0).toBeFalsy();
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should return positive delete result when primary key passed in request has incorrect field value', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForDeletion = 1;
        const deleteRowInTableResponse = await request(app.getHttpServer())
          .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=100000`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(deleteRowInTableResponse.status).toBe(400);
      } catch (err) {
        throw err;
      }
      AWSMock.restore('CognitoIdentityServiceProvider');
    });
  });

  describe('GET /table/row/:slug', () => {
    it('should return found row', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForSearch = 1;
        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(200);
        const foundRowInTableRO = JSON.parse(foundRowInTableResponse.text);
        expect(foundRowInTableRO.hasOwnProperty('row')).toBeTruthy();
        expect(foundRowInTableRO.hasOwnProperty('structure')).toBeTruthy();
        expect(foundRowInTableRO.hasOwnProperty('foreignKeys')).toBeTruthy();
        expect(foundRowInTableRO.hasOwnProperty('primaryColumns')).toBeTruthy();
        expect(foundRowInTableRO.hasOwnProperty('readonly_fields')).toBeTruthy();
        expect(typeof foundRowInTableRO.row).toBe('object');
        expect(typeof foundRowInTableRO.structure).toBe('object');
        expect(typeof foundRowInTableRO.primaryColumns).toBe('object');
        expect(typeof foundRowInTableRO.readonly_fields).toBe('object');
        expect(typeof foundRowInTableRO.foreignKeys).toBe('object');
        expect(foundRowInTableRO.row.id).toBe(1);
        expect(foundRowInTableRO.row.name).toBe(testSearchedUserName);
        expect(Object.keys(foundRowInTableRO.row).length).toBe(5);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when connection id is not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForSearch = 1;
        createConnectionRO.id = '';
        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(404);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when connection id passed in request is incorrect', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForSearch = 1;
        createConnectionRO.id = faker.random.uuid();
        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(foundRowInTableResponse.text);
        expect(message).toBe(Messages.CONNECTION_NOT_FOUND);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when tableName in not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForSearch = 1;
        const fakeTableName = '';
        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForSearch}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(foundRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NAME_MISSING);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when tableName passed in request is incorrect', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForSearch = 1;
        const fakeTableName = faker.random.word(1);
        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${fakeTableName}&id=${idForSearch}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(foundRowInTableResponse.text);
        expect(message).toBe(Messages.TABLE_NOT_FOUND);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when primary key is not passed in request', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(foundRowInTableResponse.text);
        expect(message).toBe(Messages.PRIMARY_KEY_INVALID);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when primary key passed in request has incorrect name', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForSearch = 1;
        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&fakeKeyName=${idForSearch}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(foundRowInTableResponse.text);
        expect(message).toBe(Messages.PRIMARY_KEY_INVALID);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });

    it('should throw an exception, when primary key passed in request has incorrect value', async () => {
      try {
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

        const createConnectionResponse = await request(app.getHttpServer())
          .post('/connection')
          .send(newConnection)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');
        const createConnectionRO = JSON.parse(createConnectionResponse.text);
        expect(createConnectionResponse.status).toBe(201);

        const idForSearch = 1000000;
        const foundRowInTableResponse = await request(app.getHttpServer())
          .get(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=${idForSearch}`)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json');

        expect(foundRowInTableResponse.status).toBe(400);
        const { message } = JSON.parse(foundRowInTableResponse.text);
        expect(message).toBe(Messages.ROW_PRIMARY_KEY_NOT_FOUND);
      } catch (err) {
        throw err;
      }

      AWSMock.restore('CognitoIdentityServiceProvider');
    });
  });
});
