import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import * as faker from 'faker';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';
import { Connection } from 'typeorm';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import { INestApplication } from '@nestjs/common';
import { MockFactory } from './mock.factory';
import { Test } from '@nestjs/testing';
import { TestUtils } from './utils/test.utils';
import { knex } from 'knex';
import { Cacher } from '../src/helpers/cache/cacher';

describe('Connection properties', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newConnectionProperties;
  const testTableName = 'users';
  const testTableColumnName = 'name';
  const testTAbleSecondColumnName = 'email';
  const testSearchedUserName = 'Vasia';
  const testEntitiesSeedsCount = 42;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  async function resetPostgresTestDB() {
    const { host, username, password, database, port, type, ssl, cert } = newConnection;
    const Knex = knex({
      client: type,
      connection: {
        host: host,
        user: username,
        password: password,
        database: database,
        port: port,
      },
    });
    await Knex.schema.dropTableIfExists(testTableName);
    await Knex.schema.createTableIfNotExists(testTableName, function (table) {
      table.increments();
      table.string(testTableColumnName);
      table.string(testTAbleSecondColumnName);
      table.timestamps();
    });

    for (let i = 0; i < testEntitiesSeedsCount; i++) {
      if (i === 0 || i === testEntitiesSeedsCount - 21 || i === testEntitiesSeedsCount - 5) {
        await Knex(testTableName).insert({
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

    newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
    newConnectionProperties = mockFactory.generateConnectionPropertiesUserExcluded();
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock(
      'CognitoIdentityServiceProvider',
      'listUsers',
      (newCognitoUserName, callback: (...ars: any) => void) => {
        callback(null, {
          Users: [
            {
              Attributes: [
                {},
                {},
                {
                  Name: 'email',
                  Value: 'Example@gmail.com',
                },
              ],
            },
          ],
        });
      },
    );
    await resetPostgresTestDB();
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
      console.error('After all connection properties encrypted error: ' + e);
    }
  });

  describe('POST /connection/properties/:slug', () => {
    it('should return created connection properties', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(newConnectionProperties)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(201);
      expect(createConnectionPropertiesRO.hidden_tables[0]).toBe(newConnectionProperties.hidden_tables[0]);
      expect(createConnectionPropertiesRO.connectionId).toBe(createConnectionRO.id);
      expect(uuidRegex.test(createConnectionPropertiesRO.id)).toBeTruthy();
    });

    it('should return connection without excluded tables', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(newConnectionProperties)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(201);
      expect(createConnectionPropertiesRO.hidden_tables[0]).toBe(newConnectionProperties.hidden_tables[0]);
      expect(createConnectionPropertiesRO.connectionId).toBe(createConnectionRO.id);
      expect(uuidRegex.test(createConnectionPropertiesRO.id)).toBeTruthy();

      const getConnectionTablesResponse = await request(app.getHttpServer())
        .get(`/connection/tables/${createConnectionRO.id}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const getConnectionTablesRO = JSON.parse(getConnectionTablesResponse.text);
      expect(getConnectionTablesRO.length).toBe(0);
    });

    it('should throw an exception when excluded table name is incorrect', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);
      const copyNewConnectionResponse = JSON.parse(JSON.stringify(newConnectionProperties));
      copyNewConnectionResponse.hidden_tables[0] = faker.random.word(1);
      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(copyNewConnectionResponse)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(400);
    });
  });

  describe('GET /connection/properties/:slug', () => {
    it('should return created connection properties', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(newConnectionProperties)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(201);

      const getConnectionPropertiesResponse = await request(app.getHttpServer())
        .get(`/connection/properties/${createConnectionRO.id}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const getConnectionPropertiesRO = JSON.parse(getConnectionPropertiesResponse.text);
      expect(getConnectionPropertiesRO.hidden_tables[0]).toBe(newConnectionProperties.hidden_tables[0]);
      expect(getConnectionPropertiesRO.connectionId).toBe(createConnectionRO.id);
      expect(uuidRegex.test(getConnectionPropertiesRO.id)).toBeTruthy();
    });

    it('should throw exception when connection id is incorrect', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(newConnectionProperties)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(201);

      const getConnectionPropertiesResponse = await request(app.getHttpServer())
        .get(`/connection/properties/${faker.random.uuid()}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(getConnectionPropertiesResponse.status).toBe(403);
    });
  });

  describe('DELETE /connection/properties/:slug', () => {
    it('should return created connection properties', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(newConnectionProperties)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(createConnectionPropertiesResponse.status).toBe(201);

      const getConnectionPropertiesResponse = await request(app.getHttpServer())
        .get(`/connection/properties/${createConnectionRO.id}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(createConnectionPropertiesResponse.status).toBe(201);

      const getConnectionPropertiesRO = JSON.parse(getConnectionPropertiesResponse.text);
      expect(getConnectionPropertiesRO.hidden_tables[0]).toBe(newConnectionProperties.hidden_tables[0]);
      expect(getConnectionPropertiesRO.connectionId).toBe(createConnectionRO.id);
      expect(uuidRegex.test(getConnectionPropertiesRO.id)).toBeTruthy();

      const deleteConnectionPropertiesResponse = await request(app.getHttpServer())
        .delete(`/connection/properties/${createConnectionRO.id}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(deleteConnectionPropertiesResponse.status).toBe(200);
      const deleteConnectionPropertiesRO = JSON.parse(deleteConnectionPropertiesResponse.text);

      expect(deleteConnectionPropertiesRO.hidden_tables[0]).toBe(newConnectionProperties.hidden_tables[0]);

      const getConnectionPropertiesResponseAfterDeletion = await request(app.getHttpServer())
        .get(`/connection/properties/${createConnectionRO.id}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(createConnectionPropertiesResponse.status).toBe(201);
      const getConnectionPropertiesAfterDeletionRO = getConnectionPropertiesResponseAfterDeletion.text;
      //todo check
      // expect(JSON.stringify(getConnectionPropertiesAfterDeletionRO)).toBe(null);
    });

    it('should throw exception when connection id is incorrect', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(newConnectionProperties)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(201);

      const getConnectionPropertiesResponse = await request(app.getHttpServer())
        .get(`/connection/properties/${faker.random.uuid()}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      expect(getConnectionPropertiesResponse.status).toBe(403);
    });
  });

  describe('PUT /connection/properties/:slug', () => {
    it('should return created connection properties', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);

      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(newConnectionProperties)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(201);
      expect(createConnectionPropertiesRO.hidden_tables[0]).toBe(newConnectionProperties.hidden_tables[0]);
      expect(createConnectionPropertiesRO.connectionId).toBe(createConnectionRO.id);
      expect(uuidRegex.test(createConnectionPropertiesRO.id)).toBeTruthy();
    });

    it('should throw an exception when excluded table name is incorrect', async () => {
      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      expect(createConnectionResponse.status).toBe(201);
      const copyNewConnectionResponse = JSON.parse(JSON.stringify(newConnectionProperties));
      copyNewConnectionResponse.hidden_tables[0] = faker.random.word(1);
      const createConnectionPropertiesResponse = await request(app.getHttpServer())
        .post(`/connection/properties/${createConnectionRO.id}`)
        .send(copyNewConnectionResponse)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionPropertiesRO = JSON.parse(createConnectionPropertiesResponse.text);
      expect(createConnectionPropertiesResponse.status).toBe(400);
    });
  });
});
