/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { ApplicationModule } from '../../../src/app.module.js';
import { QueryOrderingEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
const testSearchedUserName = 'Vasia';
const testTables: Array<string> = [];
let currentTest;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication() as any;
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

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
  app.getHttpServer().listen(0);
});

test.after(async () => {
  try {
    await Cacher.clearAllCache();
    await app.close();
  } catch (e) {
    console.error('After tests error ' + e);
  }
});

currentTest = `POST /table-filters/:connectionId`;
test.serial(`${currentTest} create table filters`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName } = await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const filtersDTO = {
      name: 'Test filter',
      filters: filters,
    };

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ ...filtersDTO })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);

    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('name'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(createTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(createTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(createTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(createTableFiltersRO.name, filtersDTO.name);
    t.deepEqual(createTableFiltersRO.filters, filtersDTO.filters);
  } catch (e) {
    console.error(e);
    t.fail();
  }
});

currentTest = `GET /table-filters/:connectionId/all`;
test.serial(`${currentTest} should return table filters`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const filtersDTO = {
      name: 'Test filter',
      filters: filters,
    };

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ ...filtersDTO })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);
    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('name'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(createTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(createTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(createTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(createTableFiltersRO.name, filtersDTO.name);
    t.deepEqual(createTableFiltersRO.filters, filtersDTO.filters);

    const getTableFiltersResponse = await request(app.getHttpServer())
      .get(`/table-filters/${createConnectionRO.id}/all/?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getTableFiltersRO = JSON.parse(getTableFiltersResponse.text);
    t.is(Array.isArray(getTableFiltersRO), true);
    t.is(getTableFiltersRO.length, 1);
    getTableFiltersRO.forEach((el) => {
      t.is(el.hasOwnProperty('id'), true);
      t.is(el.hasOwnProperty('name'), true);
      t.is(el.hasOwnProperty('filters'), true);
      t.is(el.hasOwnProperty('dynamic_column'), true);
      t.is(el.hasOwnProperty('createdAt'), true);
      t.is(el.hasOwnProperty('updatedAt'), true);
      t.is(el.name, filtersDTO.name);
      t.deepEqual(el.filters, filtersDTO.filters);
    });
  } catch (e) {
    console.error(e);
    t.fail();
  }
});

currentTest = `PUT /table-filters/:connectionId`;
test.serial(`${currentTest} should return updated table filters`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const updatedFilters = {
      [fieldname]: { lt: fieldvalue },
    };

    const filterDTOs = [];
    const filtersDTO = {
      name: 'Test filter',
      filters: filters,
      dynamic_column: {
        column_name: 'id',
        comparator: 'gt',
      },
    };

    const updatedFiltersDTO = {
      name: 'Test filter2',
      filters: updatedFilters,
    };
    filterDTOs.push(filtersDTO);
    filterDTOs.push(updatedFiltersDTO);

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ ...filtersDTO })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);
    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('name'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(createTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(createTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(createTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(createTableFiltersRO.name, filtersDTO.name);
    t.deepEqual(createTableFiltersRO.filters, filtersDTO.filters);

    const getTableFiltersResponse = await request(app.getHttpServer())
      .get(`/table-filters/${createConnectionRO.id}/all/?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getTableFiltersRO = JSON.parse(getTableFiltersResponse.text);
    t.is(Array.isArray(getTableFiltersRO), true);
    t.is(getTableFiltersRO.length, 1);
    getTableFiltersRO.forEach((el) => {
      t.is(el.hasOwnProperty('id'), true);
      t.is(el.hasOwnProperty('name'), true);
      t.is(el.hasOwnProperty('filters'), true);
      t.is(el.hasOwnProperty('dynamic_column'), true);
      t.is(el.hasOwnProperty('createdAt'), true);
      t.is(el.hasOwnProperty('updatedAt'), true);
      t.is(el.name, filtersDTO.name);
      t.deepEqual(el.filters, filtersDTO.filters);
    });

    const updateTableFiltersResponse = await request(app.getHttpServer())
      .put(`/table-filters/${createConnectionRO.id}/${createTableFiltersRO.id}`)
      .send({ ...updatedFiltersDTO })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const updateTableFiltersRO = JSON.parse(updateTableFiltersResponse.text);

    t.is(updateTableFiltersResponse.status, 200);
    t.is(updateTableFiltersRO.hasOwnProperty('id'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('name'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(updateTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(updateTableFiltersRO.name, updatedFiltersDTO.name);
    t.deepEqual(updateTableFiltersRO.filters, updatedFiltersDTO.filters);
  } catch (e) {
    console.error(e);
    t.fail();
  }
});

currentTest = `GET /table-filters/:connectionId/:filterId`;
test.serial(`${currentTest} should return table filters`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const filtersDTO = {
      name: 'Test filter',
      filters: filters,
      dynamic_column: {
        column_name: 'id',
        comparator: 'gt',
      },
    };

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ ...filtersDTO })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);
    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('name'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(createTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(createTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(createTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(createTableFiltersRO.name, filtersDTO.name);
    t.deepEqual(createTableFiltersRO.filters, filtersDTO.filters);

    const getTableFiltersResponse = await request(app.getHttpServer())
      .get(`/table-filters/${createConnectionRO.id}/${createTableFiltersRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const getTableFiltersRO = JSON.parse(getTableFiltersResponse.text);
    t.is(getTableFiltersRO.hasOwnProperty('id'), true);
    t.is(getTableFiltersRO.hasOwnProperty('name'), true);
    t.is(getTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(getTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(getTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(getTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(getTableFiltersRO.name, filtersDTO.name);
    t.deepEqual(getTableFiltersRO.filters, filtersDTO.filters);
    t.is(getTableFiltersRO.dynamic_column.column_name, filtersDTO.dynamic_column.column_name);
    t.is(getTableFiltersRO.dynamic_column.comparator, filtersDTO.dynamic_column.comparator);
  } catch (e) {
    console.error(e);
    t.fail();
  }
});

currentTest = `DELETE /table-filters/:connectionId/all`;

test.serial(`${currentTest} should delete table filters`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const filtersDTO = {
      name: 'Test filter',
      filters: filters,
      dynamic_column: {
        column_name: 'id',
        comparator: 'gt',
      },
    };

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ ...filtersDTO })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);
    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('name'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(createTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(createTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(createTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(createTableFiltersRO.name, filtersDTO.name);
    t.deepEqual(createTableFiltersRO.filters, filtersDTO.filters);

    const deleteTableFiltersResponse = await request(app.getHttpServer())
      .delete(`/table-filters/${createConnectionRO.id}/all/?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const deleteTableFiltersRO = JSON.parse(deleteTableFiltersResponse.text);
    t.is(deleteTableFiltersResponse.status, 200);

    // should return an empty array, when try to get deleted table filters
    const getTableFiltersResponse = await request(app.getHttpServer())
      .get(`/table-filters/${createConnectionRO.id}/all/?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getTableFiltersResponse.status, 200);
    t.deepEqual(getTableFiltersResponse.body, []);
  } catch (e) {
    console.error(e);
    t.fail();
  }
});

currentTest = `DELETE /table-filters/:connectionId/:filterId`;

test.serial(`${currentTest} should delete table filters`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const { testTableName, testTableColumnName, testEntitiesSeedsCount, testTableSecondColumnName } =
      await createTestTable(connectionToTestDB);

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const fieldname = 'id';
    const fieldvalue = '45';

    const filters = {
      [fieldname]: { lt: fieldvalue },
    };

    const filtersDTO = {
      name: 'Test filter',
      filters: filters,
      dynamic_column: {
        column_name: 'id',
        comparator: 'gt',
      },
    };

    const createTableFiltersResponse = await request(app.getHttpServer())
      .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
      .send({ ...filtersDTO })
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const createTableFiltersRO = JSON.parse(createTableFiltersResponse.text);
    t.is(createTableFiltersResponse.status, 201);
    t.is(createTableFiltersRO.hasOwnProperty('id'), true);
    t.is(createTableFiltersRO.hasOwnProperty('name'), true);
    t.is(createTableFiltersRO.hasOwnProperty('filters'), true);
    t.is(createTableFiltersRO.hasOwnProperty('dynamic_column'), true);
    t.is(createTableFiltersRO.hasOwnProperty('createdAt'), true);
    t.is(createTableFiltersRO.hasOwnProperty('updatedAt'), true);
    t.is(createTableFiltersRO.name, filtersDTO.name);
    t.deepEqual(createTableFiltersRO.filters, filtersDTO.filters);

    const deleteTableFiltersResponse = await request(app.getHttpServer())
      .delete(`/table-filters/${createConnectionRO.id}/${createTableFiltersRO.id}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const deleteTableFiltersRO = JSON.parse(deleteTableFiltersResponse.text);
    t.is(deleteTableFiltersResponse.status, 200);

    // should return an empty array, when try to get deleted table filters
    const getTableFiltersResponse = await request(app.getHttpServer())
      .get(`/table-filters/${createConnectionRO.id}/all/?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getTableFiltersResponse.status, 200);
    t.deepEqual(getTableFiltersResponse.body, []);
  } catch (e) {
    console.error(e);
    t.fail();
  }
});

currentTest = 'GET /table/rows/:slug';
test.serial(
  `${currentTest} should return rows with search, with pagination, with sorting and with filters applied from created table filters
 with search and DESC sorting`,
  async (t) => {
    try {
      const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
      const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
      const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

      testTables.push(testTableName);

      const createConnectionResponse = await request(app.getHttpServer())
        .post('/connection')
        .send(connectionToTestDB)
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      const createConnectionRO = JSON.parse(createConnectionResponse.text);
      t.is(createConnectionResponse.status, 201);

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
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createTableSettingsResponse.status, 201);

      const fieldname = 'id';
      const fieldvalue = '45';

      const filters = {
        [fieldname]: { lt: fieldvalue },
      };

      const filterDTOs = [];
      const filtersDTO = {
        name: 'Test filter',
        filters: filters,
        dynamic_column: {
          column_name: 'id',
          comparator: 'gt',
        },
      };

      const secondFiltersDTO = {
        name: 'Test filter2',
        filters: filters,
        dynamic_column: {
          column_name: 'id',
          comparator: 'lt',
        },
      };
      filterDTOs.push(filtersDTO);
      filterDTOs.push(secondFiltersDTO);

      const createTableFiltersResponse = await request(app.getHttpServer())
        .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
        .send({ ...filtersDTO })
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createTableFiltersResponse.status, 201);

      const createTableFiltersResponse2 = await request(app.getHttpServer())
        .post(`/table-filters/${createConnectionRO.id}/?tableName=${testTableName}`)
        .send({ ...secondFiltersDTO })
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(createTableFiltersResponse2.status, 201);

      const getTableRowsResponse = await request(app.getHttpServer())
        .get(
          `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${testSearchedUserName}&page=1&perPage=200`,
        )
        .set('Cookie', firstUserToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json');
      t.is(getTableRowsResponse.status, 200);

      const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

      t.is(typeof getTableRowsRO, 'object');
      t.is(getTableRowsRO.hasOwnProperty('rows'), true);
      t.is(getTableRowsRO.hasOwnProperty('primaryColumns'), true);
      t.is(getTableRowsRO.hasOwnProperty('pagination'), true);
      t.is(getTableRowsRO.rows.length, 3);
      t.is(Object.keys(getTableRowsRO.rows[1]).length, 5);

      t.is(getTableRowsRO.rows[0][testTableColumnName], testSearchedUserName);
      t.is(getTableRowsRO.rows[0].id, 38);
      t.is(getTableRowsRO.rows[1][testTableColumnName], testSearchedUserName);
      t.is(getTableRowsRO.rows[1].id, 22);

      t.is(getTableRowsRO.pagination.currentPage, 1);
      t.is(getTableRowsRO.pagination.perPage, 200);

      t.is(typeof getTableRowsRO.primaryColumns, 'object');
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('column_name'), true);
      t.is(getTableRowsRO.primaryColumns[0].hasOwnProperty('data_type'), true);
      t.is(getTableRowsRO.hasOwnProperty('saved_filters'), true);
      t.is(Array.isArray(getTableRowsRO.saved_filters), true);
      t.is(getTableRowsRO.saved_filters.length, 2);
      getTableRowsRO.saved_filters.forEach((el) => {
        t.is(el.hasOwnProperty('id'), true);
        t.is(el.hasOwnProperty('name'), true);
        t.is(el.hasOwnProperty('filters'), true);
        t.is(el.hasOwnProperty('dynamic_column'), true);
        t.is(el.hasOwnProperty('createdAt'), true);
        t.is(el.hasOwnProperty('updatedAt'), true);
        const foundFilterDTO = filterDTOs.find((filterDTO) => filterDTO.name === el.name);
        t.is(el.name, foundFilterDTO.name);
        t.deepEqual(el.filters, foundFilterDTO.filters);
      });
    } catch (error) {
      console.error(error);
      t.fail();
    }
  },
);
