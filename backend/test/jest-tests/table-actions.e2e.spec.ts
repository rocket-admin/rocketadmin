import { faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { knex } from 'knex';
import * as request from 'supertest';
import { ApplicationModule } from '../../src/app.module.js';
import { TableActionEntity } from '../../src/entities/table-actions/table-action.entity.js';
import { Messages } from '../../src/exceptions/text/messages.js';
import { Cacher } from '../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../src/shared/database/database.module.js';
import { DatabaseService } from '../../src/shared/database/database.service.js';
import { MockFactory } from '../mock.factory.js';
import { registerUserAndReturnUserInfo } from '../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../utils/test.utils.js';

describe('Tables Actions (e2e)', () => {
  jest.setTimeout(50000);
  let app: INestApplication;
  let testUtils: TestUtils;
  const mockFactory = new MockFactory();
  let newConnection;
  let newTableAction: TableActionEntity;
  const testTableName = 'users';
  const testTableColumnName = 'name';
  const testTAbleSecondColumnName = 'email';
  const testSearchedUserName = 'Vasia';
  const testEntitiesSeedsCount = 42;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ApplicationModule, DatabaseModule],
      providers: [DatabaseService, TestUtils],
    }).compile();
    testUtils = moduleFixture.get<TestUtils>(TestUtils);
    await testUtils.resetDb();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    app.getHttpServer().listen(0);
    newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
    await resetPostgresTestDB();
    newTableAction = mockFactory.generateNewTableAction();
  });

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
          [testTableColumnName]: faker.name.firstName(),
          [testTAbleSecondColumnName]: faker.internet.email(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    await Knex.destroy();
  }

  afterEach(async () => {
    await Cacher.clearAllCache();
    await testUtils.resetDb();
    await testUtils.closeDbConnection();
  });

  afterAll(async () => {
    try {
      await Cacher.clearAllCache();
      jest.setTimeout(5000);
      await testUtils.shutdownServer(app.getHttpAdapter());
      await app.close();
    } catch (e) {
      console.error('After all table actions error' + e);
    }
  });

  describe('POST /table/action/:slug', () => {
    it('should return created table action', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);
      expect(typeof createTableActionRO).toBe('object');
      expect(createTableActionRO.title).toBe(newTableAction.title);
      expect(createTableActionRO.type).toBe(newTableAction.type);
      expect(createTableActionRO.url).toBe(newTableAction.url);
      expect(createTableActionRO.hasOwnProperty('id')).toBeTruthy();
    });

    it('should throw exception when type is incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const tableActionCopy = {
        ...newTableAction,
      };
      tableActionCopy.type = faker.random.words(1) as any;

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(tableActionCopy)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(400);
      expect(createTableActionRO.message).toBe(Messages.TABLE_ACTION_TYPE_INCORRECT);
    });

    it('should throw exception when connection id incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      createConnectionRO.id = faker.datatype.uuid();
      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(403);
      expect(createTableActionRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
    });
  });

  describe('GET /table/actions/:slug', () => {
    it('should return found table actions', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      expect(createTableActionResult.status).toBe(201);

      const findTableActiponResult = await request(app.getHttpServer())
        .get(`/table/actions/${createConnectionRO.id}?tableName=${testTableName}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const findTableActionRO = JSON.parse(findTableActiponResult.text);
      expect(Array.isArray(findTableActionRO)).toBeTruthy();
      expect(findTableActionRO[0].hasOwnProperty('id')).toBeTruthy();
      expect(findTableActionRO[0].title).toBe(newTableAction.title);
      expect(findTableActionRO[0].type).toBe(newTableAction.type);
      expect(findTableActionRO[0].url).toBe(newTableAction.url);
    });

    it('should throw exception when connection id incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      expect(createTableActionResult.status).toBe(201);

      createConnectionRO.id = faker.datatype.uuid();
      const findTableActiponResult = await request(app.getHttpServer())
        .get(`/table/actions/${createConnectionRO.id}?tableName=${testTableName}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const findTableActionRO = JSON.parse(findTableActiponResult.text);
      expect(findTableActiponResult.status).toBe(403);
      expect(findTableActionRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
    });
  });

  describe('PUT /table/action/:slug', () => {
    it('should return updated table action', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);

      const updatedTableAction = {
        ...newTableAction,
      };
      updatedTableAction.title = faker.random.words(2);
      updatedTableAction.url = faker.internet.url();
      delete updatedTableAction.id;

      const updateTableActionResult = await request(app.getHttpServer())
        .put(`/table/action/${createConnectionRO.id}?tableName=${testTableName}&actionId=${createTableActionRO.id}`)
        .send(updatedTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const updateTableActionRO = JSON.parse(updateTableActionResult.text);

      expect(updateTableActionResult.status).toBe(200);

      expect(updateTableActionRO.id).toBe(createTableActionRO.id);
      expect(updateTableActionRO.title).toBe(updatedTableAction.title);
      expect(updateTableActionRO.url).toBe(updatedTableAction.url);
      expect(updateTableActionRO.type).toBe(newTableAction.type);
    });

    it('should throw exception when type is incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);

      const updatedTableAction = {
        ...newTableAction,
      };
      updatedTableAction.title = faker.random.words(2);
      updatedTableAction.url = faker.internet.url();
      updatedTableAction.type = faker.datatype.uuid() as any;

      const updateTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}&actionId=${createTableActionRO.id}`)
        .send(updatedTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const updateTableActionRO = JSON.parse(updateTableActionResult.text);
      expect(updateTableActionResult.status).toBe(400);
      expect(updateTableActionRO.message).toBe(Messages.TABLE_ACTION_TYPE_INCORRECT);
    });

    it('should throw exception when connection id incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);

      const updatedTableAction = {
        ...newTableAction,
      };
      updatedTableAction.title = faker.random.words(2);
      updatedTableAction.url = faker.internet.url();

      createConnectionRO.id = faker.datatype.uuid();
      const updateTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}&actionId=${createTableActionRO.id}`)
        .send(updatedTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const updateTableActionRO = JSON.parse(updateTableActionResult.text);
      expect(updateTableActionResult.status).toBe(403);
      expect(updateTableActionRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
    });
  });

  describe('DELETE /table/action/:slug', () => {
    it('should delete table action and return deleted table action', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);

      const deleteTableActionResult = await request(app.getHttpServer())
        .delete(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const deleteTableActionRO = JSON.parse(deleteTableActionResult.text);
      expect(deleteTableActionResult.status).toBe(200);
      expect(deleteTableActionRO.utl).toBe(createTableActionRO.utl);
      expect(deleteTableActionRO.type).toBe(createTableActionRO.type);
      expect(deleteTableActionRO.title).toBe(createTableActionRO.title);

      const getTableActionResult = await request(app.getHttpServer())
        .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const getTableActionRO = JSON.parse(getTableActionResult.text);
      expect(getTableActionResult.status).toBe(400);
      expect(getTableActionRO.message).toBe(Messages.TABLE_ACTION_NOT_FOUND);
    });

    it('should throw exception when connection id incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);

      createConnectionRO.id = faker.datatype.uuid();
      const deleteTableActionResult = await request(app.getHttpServer())
        .delete(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const deleteTableActionRO = JSON.parse(deleteTableActionResult.text);
      expect(deleteTableActionResult.status).toBe(403);
      expect(deleteTableActionRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
    });

    it('should throw exception when table action id incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);

      createTableActionRO.id = faker.datatype.uuid();
      const deleteTableActionResult = await request(app.getHttpServer())
        .delete(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const deleteTableActionRO = JSON.parse(deleteTableActionResult.text);
      expect(deleteTableActionResult.status).toBe(400);
      expect(deleteTableActionRO.message).toBe(Messages.TABLE_ACTION_NOT_FOUND);
    });
  });

  describe('GET /table/action/:slug', () => {
    it('should return found table action', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createTableActionResult.text);
      expect(createTableActionResult.status).toBe(201);

      const findTableActiponResult = await request(app.getHttpServer())
        .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const findTableActionRO = JSON.parse(findTableActiponResult.text);
      expect(findTableActiponResult.status).toBe(200);
      expect(findTableActionRO.hasOwnProperty('id')).toBeTruthy();
      expect(findTableActionRO.title).toBe(newTableAction.title);
      expect(findTableActionRO.type).toBe(newTableAction.type);
      expect(findTableActionRO.url).toBe(newTableAction.url);
    });

    it('should throw exception when connection id incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createConnectionResult.text);
      expect(createTableActionResult.status).toBe(201);

      createConnectionRO.id = faker.datatype.uuid();

      const findTableActionResult = await request(app.getHttpServer())
        .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const findTableActionRO = JSON.parse(findTableActionResult.text);
      expect(findTableActionResult.status).toBe(403);
      expect(findTableActionRO.message).toBe(Messages.DONT_HAVE_PERMISSIONS);
    });

    it('should throw exception when table action id is incorrect', async () => {
      const { token } = await registerUserAndReturnUserInfo(app);
      const createConnectionResult = await request(app.getHttpServer())
        .post('/connection')
        .send(newConnection)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createConnectionRO = JSON.parse(createConnectionResult.text);
      expect(createConnectionResult.status).toBe(201);

      const createTableActionResult = await request(app.getHttpServer())
        .post(`/table/action/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(newTableAction)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');

      const createTableActionRO = JSON.parse(createConnectionResult.text);
      expect(createTableActionResult.status).toBe(201);

      createTableActionRO.id = faker.datatype.uuid();

      const findTableActionResult = await request(app.getHttpServer())
        .get(`/table/action/${createConnectionRO.id}?actionId=${createTableActionRO.id}`)
        .set('Cookie', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const findTableActionRO = JSON.parse(findTableActionResult.text);
      expect(findTableActionResult.status).toBe(400);
      expect(findTableActionRO.message).toBe(Messages.TABLE_ACTION_NOT_FOUND);
    });
  });
});
