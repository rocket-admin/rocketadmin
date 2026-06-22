/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { publicCrudCorsMiddleware } from '../../../src/middlewares/public-crud-cors.middleware.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { dropTestTables } from '../../utils/drop-test-tables.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const testTables: Array<string> = [];
let currentTest;

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	app = moduleFixture.createNestApplication();
	_testUtils = moduleFixture.get<TestUtils>(TestUtils);

	app.use(cookieParser());
	app.use(publicCrudCorsMiddleware);
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
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
		await dropTestTables(testTables, connectionToTestDB);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnectionAndTable(): Promise<{
	token: string;
	connectionId: string;
	testTableName: string;
	testTableColumnName: string;
	testTableSecondColumnName: string;
}> {
	const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
	const token = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);
	testTables.push(testTableName);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	return {
		token,
		connectionId: createConnectionRO.id,
		testTableName,
		testTableColumnName,
		testTableSecondColumnName,
	};
}

currentTest = 'POST /table/crud/:connectionId';

test.serial(`${currentTest} should create a row and return only the created row`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	const fakeName = faker.person.firstName();
	const fakeMail = faker.internet.email();
	const row = {
		[testTableColumnName]: fakeName,
		[testTableSecondColumnName]: fakeMail,
	};

	const createResponse = await request(app.getHttpServer())
		.post(`/table/crud/${connectionId}?tableName=${testTableName}`)
		.send(JSON.stringify(row))
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createResponse.status, 201);
	const createRO = JSON.parse(createResponse.text);

	// only the row is returned, no permissions / settings / structure / foreignKeys
	t.is(Object.hasOwn(createRO, 'row'), true);
	t.is(Object.keys(createRO).length, 1);
	t.is(Object.hasOwn(createRO, 'structure'), false);
	t.is(Object.hasOwn(createRO, 'foreignKeys'), false);
	t.is(Object.hasOwn(createRO, 'primaryColumns'), false);
	t.is(Object.hasOwn(createRO, 'table_settings'), false);
	t.is(createRO.row[testTableColumnName], fakeName);
	t.is(createRO.row[testTableSecondColumnName], fakeMail);
	t.is(createRO.row.id, 43);
});

test.serial(`${currentTest} should throw an exception when connection id is not passed`, async (t) => {
	const { token, testTableName, testTableColumnName, testTableSecondColumnName } = await createConnectionAndTable();

	const row = {
		[testTableColumnName]: faker.person.firstName(),
		[testTableSecondColumnName]: faker.internet.email(),
	};

	const createResponse = await request(app.getHttpServer())
		.post(`/table/crud/?tableName=${testTableName}`)
		.send(JSON.stringify(row))
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createResponse.status, 404);
});

test.serial(`${currentTest} should throw an exception when body is empty`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	const createResponse = await request(app.getHttpServer())
		.post(`/table/crud/${connectionId}?tableName=${testTableName}`)
		.send(JSON.stringify({}))
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createResponse.status, 400);
});

currentTest = 'GET /table/crud/:connectionId';

test.serial(`${currentTest} should read a row by primary key and return only the row`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	const readResponse = await request(app.getHttpServer())
		.get(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(readResponse.status, 200);
	const readRO = JSON.parse(readResponse.text);

	t.is(Object.hasOwn(readRO, 'row'), true);
	t.is(Object.keys(readRO).length, 1);
	t.is(Object.hasOwn(readRO, 'structure'), false);
	t.is(Object.hasOwn(readRO, 'foreignKeys'), false);
	t.is(readRO.row.id, 1);
	t.is(typeof readRO.row[testTableColumnName], 'string');
	t.is(typeof readRO.row[testTableSecondColumnName], 'string');
});

test.serial(`${currentTest} should return an error when row not found by primary key`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	const readResponse = await request(app.getHttpServer())
		.get(`/table/crud/${connectionId}?tableName=${testTableName}&id=999999`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(readResponse.status, 400);
});

currentTest = 'PUT /table/crud/:connectionId';

test.serial(`${currentTest} should update a row by primary key and return only the updated row`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	const fakeName = faker.person.firstName();
	const fakeMail = faker.internet.email();
	const row = {
		[testTableColumnName]: fakeName,
		[testTableSecondColumnName]: fakeMail,
	};

	const updateResponse = await request(app.getHttpServer())
		.put(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
		.send(JSON.stringify(row))
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(updateResponse.status, 200);
	const updateRO = JSON.parse(updateResponse.text);

	t.is(Object.hasOwn(updateRO, 'row'), true);
	t.is(Object.keys(updateRO).length, 1);
	t.is(Object.hasOwn(updateRO, 'structure'), false);
	t.is(updateRO.row.id, 1);
	t.is(updateRO.row[testTableColumnName], fakeName);
	t.is(updateRO.row[testTableSecondColumnName], fakeMail);

	// verify the row was actually updated
	const readResponse = await request(app.getHttpServer())
		.get(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const readRO = JSON.parse(readResponse.text);
	t.is(readRO.row[testTableColumnName], fakeName);
});

test.serial(`${currentTest} should throw an exception when body is empty`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	const updateResponse = await request(app.getHttpServer())
		.put(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
		.send(JSON.stringify({}))
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(updateResponse.status, 400);
});

currentTest = 'DELETE /table/crud/:connectionId';

test.serial(`${currentTest} should delete a row by primary key and return the deleted row`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	const idForDeletion = 1;
	const deleteResponse = await request(app.getHttpServer())
		.delete(`/table/crud/${connectionId}?tableName=${testTableName}&id=${idForDeletion}`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(deleteResponse.status, 200);
	const deleteRO = JSON.parse(deleteResponse.text);

	t.is(Object.hasOwn(deleteRO, 'row'), true);
	t.is(Object.keys(deleteRO).length, 1);
	t.is(deleteRO.row.id, idForDeletion);

	// verify the row was actually deleted
	const readResponse = await request(app.getHttpServer())
		.get(`/table/crud/${connectionId}?tableName=${testTableName}&id=${idForDeletion}`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(readResponse.status, 400);
});

test.serial(`${currentTest} should return an error when row not found by primary key`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	const deleteResponse = await request(app.getHttpServer())
		.delete(`/table/crud/${connectionId}?tableName=${testTableName}&id=999999`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(deleteResponse.status, 400);
});

currentTest = 'POST /table/crud/rows/:connectionId';

test.serial(`${currentTest} should return only rows and pagination`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

	const getRowsResponse = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=100`)
		.send({})
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getRowsResponse.status, 200);
	const getRowsRO = JSON.parse(getRowsResponse.text);

	// only rows + pagination are returned, no structure / foreignKeys / widgets / permissions / settings
	t.is(Object.hasOwn(getRowsRO, 'rows'), true);
	t.is(Object.hasOwn(getRowsRO, 'pagination'), true);
	t.is(Object.keys(getRowsRO).length, 2);
	t.is(Object.hasOwn(getRowsRO, 'structure'), false);
	t.is(Object.hasOwn(getRowsRO, 'foreignKeys'), false);
	t.is(Object.hasOwn(getRowsRO, 'widgets'), false);
	t.is(Object.hasOwn(getRowsRO, 'primaryColumns'), false);
	t.is(Object.hasOwn(getRowsRO, 'table_permissions'), false);
	t.is(Object.hasOwn(getRowsRO, 'table_settings'), false);

	t.is(Array.isArray(getRowsRO.rows), true);
	t.is(getRowsRO.rows.length, 42);
	t.is(typeof getRowsRO.rows[0][testTableColumnName], 'string');
});

test.serial(`${currentTest} should support pagination`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	const getRowsResponse = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=10`)
		.send({})
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getRowsResponse.status, 200);
	const getRowsRO = JSON.parse(getRowsResponse.text);
	t.is(getRowsRO.rows.length, 10);
	t.is(getRowsRO.pagination.currentPage, 1);
	t.is(getRowsRO.pagination.perPage, 10);
});

test.serial(`${currentTest} should support search`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

	const getRowsResponse = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&search=Vasia`)
		.send({})
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getRowsResponse.status, 200);
	const getRowsRO = JSON.parse(getRowsResponse.text);
	// 'Vasia' is seeded into 3 rows by createTestTable
	t.is(getRowsRO.rows.length, 3);
	getRowsRO.rows.forEach((row) => t.is(row[testTableColumnName], 'Vasia'));
});

test.serial(`${currentTest} should support filtering with filters in body`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	const getRowsResponse = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}`)
		.send({ filters: { id: { eq: 1 } } })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getRowsResponse.status, 200);
	const getRowsRO = JSON.parse(getRowsResponse.text);
	t.is(getRowsRO.rows.length, 1);
	t.is(getRowsRO.rows[0].id, 1);
});

test.serial(`${currentTest} should reject when connection does not exist`, async (t) => {
	const { token, testTableName } = await createConnectionAndTable();

	const fakeConnectionId = '00000000-0000-0000-0000-000000000000';
	const getRowsResponse = await request(app.getHttpServer())
		.post(`/table/crud/rows/${fakeConnectionId}?tableName=${testTableName}`)
		.send({})
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.not(getRowsResponse.status, 200);
});

currentTest = 'Public (unauthenticated) access';

async function setPublicPermissions(
	connectionId: string,
	token: string,
	tables: Array<{ tableName: string; readableColumns?: Array<string> }>,
) {
	return request(app.getHttpServer())
		.put(`/connection/public-permissions/${connectionId}`)
		.send({ tables })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

test.serial(`${currentTest} getRows is refused (403) when no public policy is configured`, async (t) => {
	const { connectionId, testTableName } = await createConnectionAndTable();

	const res = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=100`)
		.send({})
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(res.status, 403);
});

test.serial(
	`${currentTest} getRows returns rows to an unauthenticated user when public table:query is granted`,
	async (t) => {
		const { token, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

		const setRes = await setPublicPermissions(connectionId, token, [{ tableName: testTableName }]);
		t.is(setRes.status, 200);
		t.is(JSON.parse(setRes.text).enabled, true);

		const res = await request(app.getHttpServer())
			.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=100`)
			.send({})
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(res.status, 200);
		const ro = JSON.parse(res.text);
		t.is(Array.isArray(ro.rows), true);
		t.is(ro.rows.length, 42);
		// all columns readable
		t.is(Object.hasOwn(ro.rows[0], 'id'), true);
		t.is(Object.hasOwn(ro.rows[0], testTableColumnName), true);
	},
);

test.serial(`${currentTest} getRows strips non-readable columns when only some columns are granted`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	const setRes = await setPublicPermissions(connectionId, token, [
		{ tableName: testTableName, readableColumns: [testTableColumnName] },
	]);
	t.is(setRes.status, 200);

	const res = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=10`)
		.send({})
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(res.status, 200);
	const ro = JSON.parse(res.text);
	t.true(ro.rows.length > 0);
	for (const row of ro.rows) {
		t.is(Object.hasOwn(row, testTableColumnName), true);
		t.is(Object.hasOwn(row, testTableSecondColumnName), false);
		t.is(Object.hasOwn(row, 'id'), false);
	}
});

test.serial(
	`${currentTest} readRow returns a single row to an unauthenticated user when public access is granted`,
	async (t) => {
		const { token, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

		await setPublicPermissions(connectionId, token, [{ tableName: testTableName }]);

		const res = await request(app.getHttpServer())
			.get(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(res.status, 200);
		const ro = JSON.parse(res.text);
		t.is(Object.hasOwn(ro, 'row'), true);
		t.is(Object.hasOwn(ro.row, testTableColumnName), true);
	},
);

test.serial(
	`${currentTest} write operations are refused for unauthenticated users even with public access enabled`,
	async (t) => {
		const { token, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
			await createConnectionAndTable();

		await setPublicPermissions(connectionId, token, [{ tableName: testTableName }]);

		const row = {
			[testTableColumnName]: faker.person.firstName(),
			[testTableSecondColumnName]: faker.internet.email(),
		};

		const createRes = await request(app.getHttpServer())
			.post(`/table/crud/${connectionId}?tableName=${testTableName}`)
			.send(JSON.stringify(row))
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createRes.status, 403);

		const deleteRes = await request(app.getHttpServer())
			.delete(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(deleteRes.status, 403);
	},
);

test.serial(`${currentTest} setting an empty tables array disables public access again`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	await setPublicPermissions(connectionId, token, [{ tableName: testTableName }]);
	const disableRes = await setPublicPermissions(connectionId, token, []);
	t.is(disableRes.status, 200);
	t.is(JSON.parse(disableRes.text).enabled, false);

	const res = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=10`)
		.send({})
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(res.status, 403);
});

test.serial(`${currentTest} GET public-permissions returns the configured tables`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

	await setPublicPermissions(connectionId, token, [
		{ tableName: testTableName, readableColumns: [testTableColumnName] },
	]);

	const getRes = await request(app.getHttpServer())
		.get(`/connection/public-permissions/${connectionId}`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getRes.status, 200);
	const ro = JSON.parse(getRes.text);
	t.is(ro.enabled, true);
	t.is(Array.isArray(ro.tables), true);
	const tableEntry = ro.tables.find((tbl) => tbl.tableName === testTableName);
	t.truthy(tableEntry);
	t.deepEqual(tableEntry.readableColumns, [testTableColumnName]);
});

currentTest = 'Public access security invariants';

test.serial(
	`${currentTest} EVERY CRUD endpoint denies an unauthenticated user when no public policy is configured`,
	async (t) => {
		const { connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
			await createConnectionAndTable();

		const row = JSON.stringify({
			[testTableColumnName]: faker.person.firstName(),
			[testTableSecondColumnName]: faker.internet.email(),
		});

		// getRows
		const getRows = await request(app.getHttpServer())
			.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=100`)
			.send({})
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(getRows.status, 403);
		t.is(Object.hasOwn(JSON.parse(getRows.text), 'rows'), false);

		// readRow by primary key
		const readRow = await request(app.getHttpServer())
			.get(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(readRow.status, 403);
		t.is(Object.hasOwn(JSON.parse(readRow.text), 'row'), false);

		// createRow
		const createRow = await request(app.getHttpServer())
			.post(`/table/crud/${connectionId}?tableName=${testTableName}`)
			.send(row)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createRow.status, 403);

		// updateRow
		const updateRow = await request(app.getHttpServer())
			.put(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
			.send(row)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(updateRow.status, 403);

		// deleteRow
		const deleteRow = await request(app.getHttpServer())
			.delete(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(deleteRow.status, 403);
	},
);

test.serial(`${currentTest} a public policy scoped to one table does NOT grant access to other tables`, async (t) => {
	const { token, connectionId, testTableName } = await createConnectionAndTable();

	// A second table living in the same database (same connection).
	const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
	const secondTable = await createTestTable(connectionToTestDB);
	testTables.push(secondTable.testTableName);

	// Grant public access to the FIRST table only.
	const setRes = await setPublicPermissions(connectionId, token, [{ tableName: testTableName }]);
	t.is(setRes.status, 200);

	// The granted table is reachable...
	const allowed = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=10`)
		.send({})
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(allowed.status, 200);

	// ...but the OTHER table must not be: no row data may leak.
	const deniedRows = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${secondTable.testTableName}&page=1&perPage=10`)
		.send({})
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(deniedRows.status, 403);
	t.is(Object.hasOwn(JSON.parse(deniedRows.text), 'rows'), false);

	const deniedRead = await request(app.getHttpServer())
		.get(`/table/crud/${connectionId}?tableName=${secondTable.testTableName}&id=1`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(deniedRead.status, 403);
});

test.serial(`${currentTest} readRow strips non-readable columns for an unauthenticated user`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	await setPublicPermissions(connectionId, token, [
		{ tableName: testTableName, readableColumns: [testTableColumnName] },
	]);

	const res = await request(app.getHttpServer())
		.get(`/table/crud/${connectionId}?tableName=${testTableName}&id=1`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(res.status, 200);
	const ro = JSON.parse(res.text);
	t.is(Object.hasOwn(ro.row, testTableColumnName), true);
	t.is(Object.hasOwn(ro.row, testTableSecondColumnName), false);
	t.is(Object.hasOwn(ro.row, 'id'), false);
});

test.serial(`${currentTest} an invalid/expired JWT cookie is rejected, never treated as public`, async (t) => {
	const { connectionId, token, testTableName } = await createConnectionAndTable();
	// Enable public access so that, if the bad token were silently ignored, the request would succeed.
	await setPublicPermissions(connectionId, token, [{ tableName: testTableName }]);

	const res = await request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=10`)
		.send({})
		.set('Cookie', ['rocketadmin_cookie=this.is.not.a.valid.jwt'])
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	// A malformed credential must be rejected, never silently downgraded to public access.
	// (The existing middleware surfaces this as a 4xx/5xx; the invariant is "not 200, no data leaked".)
	t.not(res.status, 200);
	t.is(Object.hasOwn(JSON.parse(res.text), 'rows'), false);
});

currentTest = 'CORS for /table/crud routes';

test.serial(
	`${currentTest} OPTIONS preflight from an arbitrary origin is answered with 204 and the origin reflected`,
	async (t) => {
		const arbitraryOrigin = 'https://some-third-party-app.example.com';

		const res = await request(app.getHttpServer())
			.options(`/table/crud/${faker.string.uuid()}?tableName=whatever`)
			.set('Origin', arbitraryOrigin)
			.set('Access-Control-Request-Method', 'POST')
			.set('Access-Control-Request-Headers', 'content-type, x-api-key');

		// Preflight is short-circuited by our middleware before any guard / global allowlist runs.
		t.is(res.status, 204);
		// `*` cannot be combined with credentials, so the origin is reflected back instead.
		t.is(res.headers['access-control-allow-origin'], arbitraryOrigin);
		t.is(res.headers['access-control-allow-credentials'], 'true');
		t.is(res.headers['vary'], 'Origin');
		t.is(res.headers['access-control-allow-methods'], 'GET,PUT,POST,DELETE');
		// Requested headers are echoed back so the browser allows them.
		t.is(res.headers['access-control-allow-headers'], 'content-type, x-api-key');
	},
);

test.serial(
	`${currentTest} a real (authenticated) request carries the reflected origin and credentials headers`,
	async (t) => {
		const { token, connectionId, testTableName } = await createConnectionAndTable();
		const arbitraryOrigin = 'https://another-origin.example.org';

		const res = await request(app.getHttpServer())
			.post(`/table/crud/rows/${connectionId}?tableName=${testTableName}&page=1&perPage=10`)
			.send({})
			.set('Origin', arbitraryOrigin)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(res.status, 200);
		t.is(res.headers['access-control-allow-origin'], arbitraryOrigin);
		t.is(res.headers['access-control-allow-credentials'], 'true');
	},
);

test.serial(`${currentTest} when no Origin header is present, no CORS headers are added`, async (t) => {
	const res = await request(app.getHttpServer())
		.options(`/table/crud/${faker.string.uuid()}?tableName=whatever`)
		.set('Access-Control-Request-Method', 'POST');

	// Still a preflight (OPTIONS on a /table/crud route) so it is short-circuited...
	t.is(res.status, 204);
	// ...but with no Origin to reflect, we must not emit an allow-origin header.
	t.is(res.headers['access-control-allow-origin'], undefined);
	t.is(res.headers['access-control-allow-credentials'], undefined);
});

test.serial(`${currentTest} non /table/crud routes are not affected by the wildcard middleware`, async (t) => {
	const arbitraryOrigin = 'https://some-third-party-app.example.com';

	const res = await request(app.getHttpServer())
		.options('/connection')
		.set('Origin', arbitraryOrigin)
		.set('Access-Control-Request-Method', 'GET');

	// The middleware only reflects the origin for /table/crud routes; everything else is left to the
	// global allowlist (which is not configured in this test app), so no wildcard reflection happens.
	t.not(res.headers['access-control-allow-origin'], arbitraryOrigin);
});

test.serial(`${currentTest} a malformed Origin is not reflected back (header-injection guard)`, async (t) => {
	const malformedOrigin = 'https://evil.example.com/path with spaces';

	const res = await request(app.getHttpServer())
		.options(`/table/crud/${faker.string.uuid()}?tableName=whatever`)
		.set('Origin', malformedOrigin)
		.set('Access-Control-Request-Method', 'POST');

	// Still answered as a preflight, but a value that does not match a valid origin is dropped, not echoed.
	t.is(res.status, 204);
	t.is(res.headers['access-control-allow-origin'], undefined);
	t.is(res.headers['access-control-allow-credentials'], undefined);
});

test.serial(
	`${currentTest} a malformed Access-Control-Request-Headers falls back to the static allowlist`,
	async (t) => {
		const arbitraryOrigin = 'https://some-third-party-app.example.com';

		const res = await request(app.getHttpServer())
			.options(`/table/crud/${faker.string.uuid()}?tableName=whatever`)
			.set('Origin', arbitraryOrigin)
			.set('Access-Control-Request-Method', 'POST')
			// Contains characters outside the header-list token grammar.
			.set('Access-Control-Request-Headers', 'content-type; injected: value');

		t.is(res.status, 204);
		// Origin is valid so it is reflected, but the unsafe requested-headers value is replaced.
		t.is(res.headers['access-control-allow-origin'], arbitraryOrigin);
		t.is(res.headers['access-control-allow-headers'], 'Content-Type, Authorization, x-api-key, masterpwd');
	},
);
