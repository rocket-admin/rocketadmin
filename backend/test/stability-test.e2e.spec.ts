import { INestApplication } from '@nestjs/common';
import { TestUtils } from './utils/test.utils';
import { MockFactory } from './mock.factory';
import { knex } from 'knex';
import { Test } from '@nestjs/testing';
import { ApplicationModule } from '../src/app.module';
import { DatabaseModule } from '../src/shared/database/database.module';
import { DatabaseService } from '../src/shared/database/database.service';
import * as request from 'supertest';
import * as faker from 'faker';
import { Connection } from 'typeorm';
import { Cacher } from '../src/helpers/cache/cacher';

xdescribe('Tables Postgres (e2e)', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  const testTableName = 'users';
  const testTableColumnName = 'name';
  const testTAbleSecondColumnName = 'email';
  const testSearchedUserName = 'Vasia';
  const testEntitiesSeedsCount = 42;

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
    await resetPostgresTestDB();
    const findAllConnectionsResponse = await request(app.getHttpServer())
      .get('/connections')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    expect(findAllConnectionsResponse.status).toBe(200);
  });

  afterAll(async () => {
    try {
      await testUtils.resetDb();
      await testUtils.closeDbConnection();
      await Cacher.clearAllCache();
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      const connect = await app.get(Connection);
      if (connect.isConnected) {
        await connect.close();
      }
      await app.close();
    } catch (e) {
      console.error('After all table-postgres field error: ' + e);
    }
  });

  describe('GET /connection/tables/:slug', () => {
    it('should return list of tables in connection', async () => {
      const results = await Promise.allSettled([
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
        await callMe(),
      ]);
      console.log('=> results', results);

      async function callMe() {
        let responseLogs = '';
        try {
          const createConnectionResponse = await request(app.getHttpServer())
            .post('/connection')
            .send(newConnection)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          const createConnectionRO = JSON.parse(createConnectionResponse.text);
          expect(createConnectionResponse.status).toBe(201);
          responseLogs += `createConnectionResponse: ${createConnectionResponse.text} `;

          const getTablesResponse = await request(app.getHttpServer())
            .get(`/connection/tables/${createConnectionRO.id}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTablesResponse.status).toBe(200);

          responseLogs += `getTablesResponse: ${getTablesResponse.text} `;

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
          expect(updateRowInTableResponse.status).toBe(200);
          const updateRowInTableRO = JSON.parse(updateRowInTableResponse.text);
          responseLogs += `updateRowInTableResponse: ${updateRowInTableResponse.text} `;
          const getTableRowsResponse = await request(app.getHttpServer())
            .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}&page=1&perPage=50`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
          expect(getTableRowsResponse.status).toBe(200);
          responseLogs += `getTableRowsResponse: ${getTableRowsResponse.text} `;
          return true;
        } catch (err) {
          console.log('responseLogs => ', responseLogs);
          return err;
        }
      }
    });
  });
});
