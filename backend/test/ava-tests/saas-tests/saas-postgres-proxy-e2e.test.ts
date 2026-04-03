import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import net from 'net';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { createTestTable } from '../../utils/create-test-table.js';
import {
  createInitialTestUser,
  registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let skipAll = false;

const PROXY_HOST = process.env.POSTGRES_PROXY_HOST || 'postgres-proxy';
const PROXY_PORT = parseInt(process.env.POSTGRES_PROXY_PORT || '5432', 10);

// Direct connection to the upstream Postgres (for seeding test data)
const upstreamConnectionParams = {
  type: 'postgres',
  host: process.env.UPSTREAM_PG_HOST || 'testPg-proxy-e2e',
  port: parseInt(process.env.UPSTREAM_PG_PORT || '5432', 10),
  username: 'postgres',
  password: 'proxy_test_123',
  database: 'postgres',
  ssh: false,
};

// Connection DTO that points to the proxy (used in rocketadmin API)
function createProxyConnectionDto() {
  return {
    title: 'Test connection through Postgres Proxy',
    type: 'postgres',
    host: PROXY_HOST,
    port: PROXY_PORT,
    username: 'proxy_user',
    password: 'proxy_pass',
    database: 'postgres',
    ssh: false,
    ssl: false,
  };
}

async function isProxyReachable(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(PROXY_PORT, PROXY_HOST);
  });
}

test.before(async () => {
  const reachable = await isProxyReachable();
  if (!reachable) {
    console.log(`[postgres-proxy e2e] Proxy not reachable at ${PROXY_HOST}:${PROXY_PORT}, skipping tests`);
    skipAll = true;
    return;
  }

  setSaasEnvVariable();
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();

  app = moduleFixture.createNestApplication() as any;
  _testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(WinstonLogger)));
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory(validationErrors: ValidationError[] = []) {
        return new ValidationException(validationErrors);
      },
    }),
  );
  await app.init();
  await createInitialTestUser(app);
  app.getHttpServer().listen(0);
});

test.after(async () => {
  if (skipAll) return;
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
});

function maybeSkip(t: any): boolean {
  if (skipAll) {
    t.pass('skipped: proxy not available');
    return true;
  }
  return false;
}

test.serial(
  'should list tables through the proxy via rocketadmin API',
  async (t) => {
    if (maybeSkip(t)) return;
    try {
      // 1. Seed a test table directly on the upstream Postgres
      const { testTableName } = await createTestTable(upstreamConnectionParams, 5);

      // 2. Register user and create connection pointing to the proxy
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const proxyConnectionDto = createProxyConnectionDto();

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(proxyConnectionDto)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createConnectionResponse.status, 201);
      const createConnectionRO = JSON.parse(createConnectionResponse.text);

      // 3. Get tables through the proxy
      const getTablesResponse = await request(app.getHttpServer())
        .get(`/connection/tables/${createConnectionRO.id}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(getTablesResponse.status, 200);

      const tables = JSON.parse(getTablesResponse.text);
      t.true(Array.isArray(tables));
      t.true(tables.length > 0);

      const testTable = tables.find((tbl: any) => tbl.table === testTableName);
      t.truthy(testTable, `Table "${testTableName}" should be visible through the proxy`);
      t.is(testTable.permissions.visibility, true);
      t.is(testTable.permissions.readonly, false);
      t.is(testTable.permissions.add, true);
      t.is(testTable.permissions.delete, true);
      t.is(testTable.permissions.edit, true);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  'should get table rows through the proxy via rocketadmin API',
  async (t) => {
    if (maybeSkip(t)) return;
    try {
      const seedCount = 10;
      const { testTableName, testTableColumnName, testTableSecondColumnName } =
        await createTestTable(upstreamConnectionParams, seedCount);

      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const proxyConnectionDto = createProxyConnectionDto();

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(proxyConnectionDto)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createConnectionResponse.status, 201);
      const createConnectionRO = JSON.parse(createConnectionResponse.text);

      const getRowsResponse = await request(app.getHttpServer())
        .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(getRowsResponse.status, 200);

      const rowsRO = JSON.parse(getRowsResponse.text);
      t.true(Object.hasOwn(rowsRO, 'rows'));
      t.true(Object.hasOwn(rowsRO, 'primaryColumns'));
      t.true(Object.hasOwn(rowsRO, 'pagination'));
      t.is(rowsRO.rows.length, seedCount);
      t.true(Object.hasOwn(rowsRO.rows[0], 'id'));
      t.true(Object.hasOwn(rowsRO.rows[0], testTableColumnName));
      t.true(Object.hasOwn(rowsRO.rows[0], testTableSecondColumnName));
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  'should add a row through the proxy via rocketadmin API',
  async (t) => {
    if (maybeSkip(t)) return;
    try {
      const { testTableName, testTableColumnName, testTableSecondColumnName } =
        await createTestTable(upstreamConnectionParams, 3);

      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const proxyConnectionDto = createProxyConnectionDto();

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(proxyConnectionDto)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createConnectionResponse.status, 201);
      const createConnectionRO = JSON.parse(createConnectionResponse.text);

      const newName = faker.person.firstName();
      const newEmail = faker.internet.email();

      const addRowResponse = await request(app.getHttpServer())
        .post(`/table/row/${createConnectionRO.id}?tableName=${testTableName}`)
        .send(
          JSON.stringify({
            [testTableColumnName]: newName,
            [testTableSecondColumnName]: newEmail,
          }),
        )
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(addRowResponse.status, 201);

      const addRowRO = JSON.parse(addRowResponse.text);
      t.true(Object.hasOwn(addRowRO, 'row'));
      t.is(addRowRO.row[testTableColumnName], newName);
      t.is(addRowRO.row[testTableSecondColumnName], newEmail);

      // Verify row count increased
      const getRowsResponse = await request(app.getHttpServer())
        .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(getRowsResponse.status, 200);

      const rowsRO = JSON.parse(getRowsResponse.text);
      t.is(rowsRO.rows.length, 4); // 3 seeded + 1 added
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  'should update a row through the proxy via rocketadmin API',
  async (t) => {
    if (maybeSkip(t)) return;
    try {
      const { testTableName, testTableColumnName, testTableSecondColumnName } =
        await createTestTable(upstreamConnectionParams, 3);

      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const proxyConnectionDto = createProxyConnectionDto();

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(proxyConnectionDto)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createConnectionResponse.status, 201);
      const createConnectionRO = JSON.parse(createConnectionResponse.text);

      const updatedName = faker.person.firstName();
      const updatedEmail = faker.internet.email();

      const updateRowResponse = await request(app.getHttpServer())
        .put(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=1`)
        .send(
          JSON.stringify({
            [testTableColumnName]: updatedName,
            [testTableSecondColumnName]: updatedEmail,
          }),
        )
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(updateRowResponse.status, 200);

      const updateRowRO = JSON.parse(updateRowResponse.text);
      t.true(Object.hasOwn(updateRowRO, 'row'));
      t.is(updateRowRO.row[testTableColumnName], updatedName);
      t.is(updateRowRO.row[testTableSecondColumnName], updatedEmail);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  'should delete a row through the proxy via rocketadmin API',
  async (t) => {
    if (maybeSkip(t)) return;
    try {
      const { testTableName } = await createTestTable(upstreamConnectionParams, 5);

      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const proxyConnectionDto = createProxyConnectionDto();

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(proxyConnectionDto)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createConnectionResponse.status, 201);
      const createConnectionRO = JSON.parse(createConnectionResponse.text);

      const deleteRowResponse = await request(app.getHttpServer())
        .delete(`/table/row/${createConnectionRO.id}?tableName=${testTableName}&id=1`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(deleteRowResponse.status, 200);

      // Verify row count decreased
      const getRowsResponse = await request(app.getHttpServer())
        .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(getRowsResponse.status, 200);

      const rowsRO = JSON.parse(getRowsResponse.text);
      t.is(rowsRO.rows.length, 4); // 5 seeded - 1 deleted
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);

test.serial(
  'should get table structure through the proxy via rocketadmin API',
  async (t) => {
    if (maybeSkip(t)) return;
    try {
      const { testTableName, testTableColumnName, testTableSecondColumnName } =
        await createTestTable(upstreamConnectionParams, 3);

      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const proxyConnectionDto = createProxyConnectionDto();

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(proxyConnectionDto)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createConnectionResponse.status, 201);
      const createConnectionRO = JSON.parse(createConnectionResponse.text);

      const getStructureResponse = await request(app.getHttpServer())
        .get(`/table/structure/${createConnectionRO.id}?tableName=${testTableName}`)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(getStructureResponse.status, 200);

      const structureRO = JSON.parse(getStructureResponse.text);
      t.true(typeof structureRO === 'object');
      t.true(Array.isArray(structureRO.structure));
      t.true(structureRO.structure.length > 0);
      t.true(Object.hasOwn(structureRO, 'primaryColumns'));
      t.true(Object.hasOwn(structureRO, 'foreignKeys'));

      const columnNames = structureRO.structure.map((col: any) => col.column_name);
      t.true(columnNames.includes('id'));
      t.true(columnNames.includes(testTableColumnName));
      t.true(columnNames.includes(testTableSecondColumnName));
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
);
