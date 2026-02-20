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
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { CreateTableCategoryDto } from '../../../src/entities/table-categories/dto/create-table-category.dto.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const _testSearchedUserName = 'Vasia';
const _testTables: Array<string> = [];
let currentTest;

test.before(async () => {
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

currentTest = `PUT /table-categories/:connectionId`;
test.serial(`${currentTest} create table categories`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const { testTableName: firstTesTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: secondTesTableName } = await createTestTable(connectionToTestDB);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const categoriesDTO: Array<CreateTableCategoryDto> = [
			{
				category_name: 'Category 1',
				category_color: '#FF5733',
				tables: [firstTesTableName],
				category_id: 'cat-001',
			},
			{
				category_name: 'Category 2',
				category_color: '#33FF57',
				tables: [secondTesTableName],
				category_id: 'cat-002',
			},
			{
				category_name: 'Category 3',
				category_color: '#3357FF',
				tables: [firstTesTableName, secondTesTableName],
				category_id: 'cat-003',
			},
		];

		const createTableCategoriesResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send(categoriesDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const createTableCategoriesRO = JSON.parse(createTableCategoriesResponse.text);

		t.is(createTableCategoriesResponse.status, 200);

		t.is(createTableCategoriesRO.length, 3);
		t.is(createTableCategoriesRO[0].category_name, 'Category 1');
		t.is(createTableCategoriesRO[0].category_color, '#FF5733');
		t.is(createTableCategoriesRO[0].category_id, 'cat-001');
		t.deepEqual(createTableCategoriesRO[0].tables, [firstTesTableName]);
		t.is(createTableCategoriesRO[1].category_name, 'Category 2');
		t.is(createTableCategoriesRO[1].category_color, '#33FF57');
		t.is(createTableCategoriesRO[1].category_id, 'cat-002');
		t.deepEqual(createTableCategoriesRO[1].tables, [secondTesTableName]);
		t.is(createTableCategoriesRO[2].category_name, 'Category 3');
		t.is(createTableCategoriesRO[2].category_color, '#3357FF');
		t.is(createTableCategoriesRO[2].category_id, 'cat-003');
		t.deepEqual(createTableCategoriesRO[2].tables, [firstTesTableName, secondTesTableName]);

		// should recreate categories on the new request
		const recreateTableCategoriesResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send([categoriesDTO[0]])
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const recreateTableCategoriesRO = JSON.parse(recreateTableCategoriesResponse.text);

		t.is(recreateTableCategoriesResponse.status, 200);

		t.is(recreateTableCategoriesRO.length, 1);
		t.is(recreateTableCategoriesRO[0].category_name, 'Category 1');
		t.is(recreateTableCategoriesRO[0].category_color, '#FF5733');
		t.is(recreateTableCategoriesRO[0].category_id, 'cat-001');
		t.deepEqual(recreateTableCategoriesRO[0].tables, [firstTesTableName]);
	} catch (e) {
		console.error(e);
		t.fail();
	}
});

test.serial(`${currentTest} should throw validation exceptions, when table categories dto is invalid`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const { testTableName: firstTesTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: secondTesTableName } = await createTestTable(connectionToTestDB);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const categoriesDTO = [
			{
				category_name: 'Category 1',
				tables: '[firstTesTableName]',
			},
			{
				category_name: 'Category 2',
				tables: ['non-real-table'],
			},
			{
				category_name: null,
				tables: [firstTesTableName, secondTesTableName],
			},
		];

		const createTableCategoriesResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send(categoriesDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const _createTableCategoriesRO = JSON.parse(createTableCategoriesResponse.text);
		// console.log('🚀 ~ createTableCategoriesRO:', createTableCategoriesRO);

		t.is(createTableCategoriesResponse.status, 400);
	} catch (e) {
		console.error(e);
		t.fail();
	}
});

currentTest = `GET /table-categories/:connectionId`;
test.serial(`${currentTest} find table categories`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const { testTableName: firstTesTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: secondTesTableName } = await createTestTable(connectionToTestDB);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const categoriesDTO: Array<CreateTableCategoryDto> = [
			{
				category_name: 'Category 1',
				category_color: '#FF5733',
				tables: [firstTesTableName],
				category_id: 'cat-001',
			},
			{
				category_name: 'Category 2',
				category_color: '#33FF57',
				tables: [secondTesTableName],
				category_id: 'cat-002',
			},
			{
				category_name: 'Category 3',
				category_color: '#3357FF',
				tables: [firstTesTableName, secondTesTableName],
				category_id: 'cat-003',
			},
		];

		const createTableCategoriesResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send(categoriesDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableCategoriesResponse.status, 200);

		const findTableCategoriesResponse = await request(app.getHttpServer())
			.get(`/table-categories/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const findTableCategoriesRO = JSON.parse(findTableCategoriesResponse.text);

		t.is(findTableCategoriesResponse.status, 200);

		t.is(findTableCategoriesRO.length, 3);
		t.is(findTableCategoriesRO[0].category_name, 'Category 1');
		t.is(findTableCategoriesRO[0].category_color, '#FF5733');
		t.is(findTableCategoriesRO[0].category_id, 'cat-001');
		t.deepEqual(findTableCategoriesRO[0].tables, [firstTesTableName]);
		t.is(findTableCategoriesRO[1].category_name, 'Category 2');
		t.is(findTableCategoriesRO[1].category_color, '#33FF57');
		t.is(findTableCategoriesRO[1].category_id, 'cat-002');
		t.deepEqual(findTableCategoriesRO[1].tables, [secondTesTableName]);
		t.is(findTableCategoriesRO[2].category_name, 'Category 3');
		t.is(findTableCategoriesRO[2].category_color, '#3357FF');
		t.is(findTableCategoriesRO[2].category_id, 'cat-003');
		t.deepEqual(findTableCategoriesRO[2].tables, [firstTesTableName, secondTesTableName]);

		// should recreate categories on the new request
		const recreateTableCategoriesResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send([categoriesDTO[0]])
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const _recreateTableCategoriesRO = JSON.parse(recreateTableCategoriesResponse.text);

		t.is(recreateTableCategoriesResponse.status, 200);

		// get should return updated categories
		const getAfterRecreateTableCategoriesResponse = await request(app.getHttpServer())
			.get(`/table-categories/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const getAfterRecreateTableCategoriesRO = JSON.parse(getAfterRecreateTableCategoriesResponse.text);

		t.is(getAfterRecreateTableCategoriesResponse.status, 200);

		t.is(getAfterRecreateTableCategoriesRO.length, 1);
		t.is(getAfterRecreateTableCategoriesRO[0].category_name, 'Category 1');
		t.is(getAfterRecreateTableCategoriesRO[0].category_color, '#FF5733');
		t.is(getAfterRecreateTableCategoriesRO[0].category_id, 'cat-001');
		t.deepEqual(getAfterRecreateTableCategoriesRO[0].tables, [firstTesTableName]);
	} catch (e) {
		console.error(e);
		t.fail();
	}
});

currentTest = `GET /table-categories/v2/:connectionId`;
test.serial(`${currentTest} find table categories with tables`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const { testTableName: firstTestTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: secondTestTableName } = await createTestTable(connectionToTestDB);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const categoriesDTO: Array<CreateTableCategoryDto> = [
			{
				category_name: 'Category 1',
				category_color: '#FF5733',
				tables: [firstTestTableName],
				category_id: 'cat-001',
			},
			{
				category_name: 'Category 2',
				category_color: '#33FF57',
				tables: [secondTestTableName],
				category_id: 'cat-002',
			},
		];

		const createTableCategoriesResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send(categoriesDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableCategoriesResponse.status, 200);

		const findTableCategoriesWithTablesResponse = await request(app.getHttpServer())
			.get(`/table-categories/v2/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const findTableCategoriesWithTablesRO = JSON.parse(findTableCategoriesWithTablesResponse.text);

		t.is(findTableCategoriesWithTablesResponse.status, 200);

		t.is(findTableCategoriesWithTablesRO[0].category_name, 'All tables');
		t.is(findTableCategoriesWithTablesRO[0].category_id, null);
		t.is(findTableCategoriesWithTablesRO[0].category_color, null);
		t.true(findTableCategoriesWithTablesRO[0].tables.length >= 2);

		const allTablesCategory = findTableCategoriesWithTablesRO[0];
		const firstTableInAll = allTablesCategory.tables.find((table) => table.table === firstTestTableName);
		const secondTableInAll = allTablesCategory.tables.find((table) => table.table === secondTestTableName);

		t.truthy(firstTableInAll);
		t.truthy(secondTableInAll);
		t.is(typeof firstTableInAll.isView, 'boolean');
		t.truthy(firstTableInAll.permissions);
		t.is(typeof firstTableInAll.permissions.visibility, 'boolean');
		t.is(typeof firstTableInAll.permissions.readonly, 'boolean');
		t.is(typeof firstTableInAll.permissions.add, 'boolean');
		t.is(typeof firstTableInAll.permissions.delete, 'boolean');
		t.is(typeof firstTableInAll.permissions.edit, 'boolean');

		t.is(findTableCategoriesWithTablesRO.length, 3);

		t.is(findTableCategoriesWithTablesRO[1].category_name, 'Category 1');
		t.is(findTableCategoriesWithTablesRO[1].category_color, '#FF5733');
		t.is(findTableCategoriesWithTablesRO[1].category_id, 'cat-001');
		t.is(findTableCategoriesWithTablesRO[1].tables.length, 1);
		t.is(findTableCategoriesWithTablesRO[1].tables[0].table, firstTestTableName);

		t.is(findTableCategoriesWithTablesRO[2].category_name, 'Category 2');
		t.is(findTableCategoriesWithTablesRO[2].category_color, '#33FF57');
		t.is(findTableCategoriesWithTablesRO[2].category_id, 'cat-002');
		t.is(findTableCategoriesWithTablesRO[2].tables.length, 1);
		t.is(findTableCategoriesWithTablesRO[2].tables[0].table, secondTestTableName);
	} catch (e) {
		console.error(e);
		t.fail();
	}
});

test.serial(`${currentTest} should preserve table order from database in category response`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const { testTableName: firstTestTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: secondTestTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: thirdTestTableName } = await createTestTable(connectionToTestDB);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		// intentionally order tables as: third, first, second
		const categoriesDTO: Array<CreateTableCategoryDto> = [
			{
				category_name: 'Ordered Category',
				category_color: '#AABBCC',
				tables: [thirdTestTableName, firstTestTableName, secondTestTableName],
				category_id: 'cat-order-001',
			},
		];

		const createTableCategoriesResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send(categoriesDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableCategoriesResponse.status, 200);

		const findTableCategoriesWithTablesResponse = await request(app.getHttpServer())
			.get(`/table-categories/v2/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const findTableCategoriesWithTablesRO = JSON.parse(findTableCategoriesWithTablesResponse.text);
		t.is(findTableCategoriesWithTablesResponse.status, 200);

		// index 0 is "All tables", index 1 is our category
		t.is(findTableCategoriesWithTablesRO[1].category_name, 'Ordered Category');
		t.is(findTableCategoriesWithTablesRO[1].tables.length, 3);

		// verify the order matches what was stored in the database: third, first, second
		t.is(findTableCategoriesWithTablesRO[1].tables[0].table, thirdTestTableName);
		t.is(findTableCategoriesWithTablesRO[1].tables[1].table, firstTestTableName);
		t.is(findTableCategoriesWithTablesRO[1].tables[2].table, secondTestTableName);
	} catch (e) {
		console.error(e);
		t.fail();
	}
});

test.serial(`${currentTest} should preserve table order after creating and updating categories`, async (t) => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const { testTableName: firstTestTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: secondTestTableName } = await createTestTable(connectionToTestDB);
		const { testTableName: thirdTestTableName } = await createTestTable(connectionToTestDB);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		// create category with initial order: third, first, second
		const initialCategoriesDTO: Array<CreateTableCategoryDto> = [
			{
				category_name: 'Ordered Category',
				category_color: '#AABBCC',
				tables: [thirdTestTableName, firstTestTableName, secondTestTableName],
				category_id: 'cat-order-001',
			},
		];

		const createResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send(initialCategoriesDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createRO = JSON.parse(createResponse.text);
		t.is(createResponse.status, 200);

		// verify order in creation response
		t.deepEqual(createRO[0].tables, [thirdTestTableName, firstTestTableName, secondTestTableName]);

		// verify order in v2 GET after creation
		const getAfterCreateResponse = await request(app.getHttpServer())
			.get(`/table-categories/v2/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const getAfterCreateRO = JSON.parse(getAfterCreateResponse.text);
		t.is(getAfterCreateResponse.status, 200);
		t.is(getAfterCreateRO[1].tables[0].table, thirdTestTableName);
		t.is(getAfterCreateRO[1].tables[1].table, firstTestTableName);
		t.is(getAfterCreateRO[1].tables[2].table, secondTestTableName);

		// update category with new order: second, third, first
		const updatedCategoriesDTO: Array<CreateTableCategoryDto> = [
			{
				category_name: 'Ordered Category',
				category_color: '#AABBCC',
				tables: [secondTestTableName, thirdTestTableName, firstTestTableName],
				category_id: 'cat-order-001',
			},
		];

		const updateResponse = await request(app.getHttpServer())
			.put(`/table-categories/${createConnectionRO.id}`)
			.send(updatedCategoriesDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const updateRO = JSON.parse(updateResponse.text);
		t.is(updateResponse.status, 200);

		// verify order in update response
		t.deepEqual(updateRO[0].tables, [secondTestTableName, thirdTestTableName, firstTestTableName]);

		// verify order in v2 GET after update
		const getAfterUpdateResponse = await request(app.getHttpServer())
			.get(`/table-categories/v2/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const getAfterUpdateRO = JSON.parse(getAfterUpdateResponse.text);
		t.is(getAfterUpdateResponse.status, 200);
		t.is(getAfterUpdateRO[1].tables.length, 3);
		t.is(getAfterUpdateRO[1].tables[0].table, secondTestTableName);
		t.is(getAfterUpdateRO[1].tables[1].table, thirdTestTableName);
		t.is(getAfterUpdateRO[1].tables[2].table, firstTestTableName);
	} catch (e) {
		console.error(e);
		t.fail();
	}
});
