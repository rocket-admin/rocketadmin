/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
/* eslint-disable prefer-const */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { getTestKnex } from '../../utils/get-test-knex.js';
import { hexToBinary } from '../../../src/helpers/binary-to-hex.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest;

test.before(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [ApplicationModule, DatabaseModule],
    providers: [DatabaseService, TestUtils],
  }).compile();
  app = moduleFixture.createNestApplication();
  testUtils = moduleFixture.get<TestUtils>(TestUtils);

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
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

currentTest = '';

test.serial(`${currentTest} should return list of tables in connection`, async (t) => {
  try {
    const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
    const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
    const connectionParamsCopy = {
      ...connectionToTestDB,
    };

    const testTableName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
    const testTableColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
    const testTableSecondColumnName = `${faker.lorem.words(1)}_${faker.lorem.words(1)}`;
    const Knex = getTestKnex(connectionParamsCopy);
    await Knex.schema.createTable(testTableName, function (table) {
      table.increments();
      table.binary(testTableColumnName);
      table.string(testTableSecondColumnName);
      table.timestamps();
    });

    const testDataForInsert = {
      [testTableColumnName]: hexToBinary('6168616c6169206d6168616c6169'),
      [testTableSecondColumnName]: 'test',
    };

    await Knex(testTableName).insert({
      ...testDataForInsert,
    });

    for (let i = 0; i < 8; i++) {
      await Knex(testTableName).insert({
        [testTableColumnName]: hexToBinary(`6168616c616${i}206d6168616c6169`),
        [testTableSecondColumnName]: `test_${i}`,
      });
    }

    const createConnectionResponse = await request(app.getHttpServer())
      .post('/connection')
      .send(connectionToTestDB)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    const createConnectionRO = JSON.parse(createConnectionResponse.text);
    t.is(createConnectionResponse.status, 201);

    const getTableRowsResponse = await request(app.getHttpServer())
      .get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    t.is(getTableRowsResponse.status, 200);

    const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

    const getTableRowsWithSearchResponse = await request(app.getHttpServer())
      .get(
        `/table/rows/${createConnectionRO.id}?tableName=${testTableName}&search=${getTableRowsRO.rows[0][testTableColumnName]}`,
      )
      .set('Cookie', firstUserToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
    t.is(getTableRowsResponse.status, 200);
    const getTableRowsWithSearchRO = JSON.parse(getTableRowsWithSearchResponse.text);
    t.is(getTableRowsWithSearchRO.rows.length, 1);
    t.is(getTableRowsWithSearchRO.rows[0][testTableColumnName], getTableRowsRO.rows[0][testTableColumnName]);

    t.pass();
  } catch (e) {
    console.error(e);
    throw e;
  }
});
