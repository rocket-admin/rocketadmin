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
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import {
	createTestMySQLTablesWithComplexPFKeys,
	createTestMySQLTablesWithSimplePFKeys,
} from '../../utils/test-utilities/create-test-mysql-tables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const _testSearchedUserName = 'Vasia';
const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;

let testTablesCompositeKeysData: TableCreationResult;
let testTablesSimpleKeysData: TableCreationResult;

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

	testTablesCompositeKeysData = await createTestMySQLTablesWithComplexPFKeys(connectionToTestDB);
	testTablesSimpleKeysData = await createTestMySQLTablesWithSimplePFKeys(connectionToTestDB);
});

test.after(async () => {
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

export type TableCreationResult = {
	main_table: {
		table_name: string;
		column_names: string[];
		foreign_key_column_names: string[];
		binary_column_names: string[];
		primary_key_column_names: string[];
	};
	first_referenced_table: {
		table_name: string;
		column_names: string[];
		primary_key_column_names: string[];
	};
	second_referenced_table: {
		table_name: string;
		column_names: string[];
		primary_key_column_names: string[];
		foreign_key_column_names: string[];
	};
};

// GET /connection/tables/:slug

test.serial(
	`GET /connection/tables/:slug - Should return list of table rows with referenced columns, when primary and foreign keys has composite structure`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table, first_referenced_table, second_referenced_table } = testTablesCompositeKeysData;

			const getMainTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const _getMainTableRowsRO = JSON.parse(getMainTableRowsResponse.text);
			t.is(getMainTableRowsResponse.status, 200);

			const getFirstReferencedTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const getFirstReferencedTableRowsRO = JSON.parse(getFirstReferencedTableRowsResponse.text);
			t.is(getFirstReferencedTableRowsResponse.status, 200);

			const firstReturnedRows = getFirstReferencedTableRowsRO.rows;

			for (const row of firstReturnedRows) {
				t.is(typeof row.order_id, 'object');
				t.truthy(Object.hasOwn(row.order_id, 'order_id'));
				t.truthy(row.order_id.order_id);
				t.truthy(typeof row.order_id.order_id === 'number');
				t.is(typeof row.customer_id, 'object');
				t.truthy(Object.hasOwn(row.customer_id, 'customer_id'));
				t.truthy(row.customer_id.customer_id);
				t.truthy(typeof row.customer_id.customer_id === 'number');
			}

			const getSecondReferencedTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${second_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const getSecondReferencedTableRowsRO = JSON.parse(getSecondReferencedTableRowsResponse.text);
			t.is(getSecondReferencedTableRowsResponse.status, 200);
			const secondReturnedRows = getSecondReferencedTableRowsRO.rows;
			for (const row of secondReturnedRows) {
				t.is(typeof row.order_id, 'object');
				t.truthy(Object.hasOwn(row.order_id, 'order_id'));
				t.truthy(row.order_id.order_id);
				t.truthy(typeof row.order_id.order_id === 'number');
				t.is(typeof row.customer_id, 'object');
				t.truthy(Object.hasOwn(row.customer_id, 'customer_id'));
				t.truthy(row.customer_id.customer_id);
				t.truthy(typeof row.customer_id.customer_id === 'number');
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /connection/tables/:slug - Should return list of table rows with referenced columns, when primary and foreign keys has simple structure`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table, first_referenced_table, second_referenced_table } = testTablesSimpleKeysData;

			const getMainTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const _getMainTableRowsRO = JSON.parse(getMainTableRowsResponse.text);
			t.is(getMainTableRowsResponse.status, 200);

			const getFirstReferencedTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const getFirstReferencedTableRowsRO = JSON.parse(getFirstReferencedTableRowsResponse.text);
			t.is(getFirstReferencedTableRowsResponse.status, 200);

			const firstReturnedRows = getFirstReferencedTableRowsRO.rows;

			for (const element of firstReturnedRows) {
				t.is(typeof element.customer_id, 'object');
				t.truthy(Object.hasOwn(element.customer_id, 'customer_id'));
				t.truthy(element.customer_id.customer_id);
				t.truthy(typeof element.customer_id.customer_id === 'number');
			}

			const getSecondReferencedTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${second_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const getSecondReferencedTableRowsRO = JSON.parse(getSecondReferencedTableRowsResponse.text);
			t.is(getSecondReferencedTableRowsResponse.status, 200);

			const secondReturnedRows = getSecondReferencedTableRowsRO.rows;
			for (const element of secondReturnedRows) {
				t.is(typeof element.order_id, 'object');
				t.truthy(Object.hasOwn(element.order_id, 'order_id'));
				t.truthy(element.order_id.order_id);
				t.truthy(typeof element.order_id.order_id === 'number');
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// GET /table/structure/:connectionId

test.serial(
	`GET /table/structure/:connectionId - Should return table structure for composite primary key table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table } = testTablesCompositeKeysData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const structureRO = JSON.parse(getStructureResponse.text);
			t.is(getStructureResponse.status, 200);
			t.truthy(structureRO.structure);
			t.truthy(Array.isArray(structureRO.structure));
			t.truthy(structureRO.structure.length > 0);

			const columnNames = structureRO.structure.map((col: any) => col.column_name);
			for (const expectedCol of main_table.column_names) {
				t.truthy(columnNames.includes(expectedCol), `Structure should include column ${expectedCol}`);
			}

			const orderIdCol = structureRO.structure.find((col: any) => col.column_name === 'order_id');
			const customerIdCol = structureRO.structure.find((col: any) => col.column_name === 'customer_id');
			t.truthy(orderIdCol);
			t.truthy(customerIdCol);

			// Validate primaryColumns
			t.truthy(structureRO.primaryColumns);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('order_id'));
			t.truthy(primaryColumnNames.includes('customer_id'));
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/structure/:connectionId - Should return structure for referenced table with foreign keys`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { first_referenced_table } = testTablesCompositeKeysData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			t.truthy(structureRO.structure);
			t.truthy(Array.isArray(structureRO.structure));

			const columnNames = structureRO.structure.map((col: any) => col.column_name);
			t.truthy(columnNames.includes('item_id'));
			t.truthy(columnNames.includes('order_id'));
			t.truthy(columnNames.includes('customer_id'));
			t.truthy(columnNames.includes('product_name'));
			t.truthy(columnNames.includes('quantity'));
			t.truthy(columnNames.includes('price_per_unit'));

			// Validate foreignKeys are present for referenced table
			t.truthy(structureRO.foreignKeys);
			t.truthy(structureRO.foreignKeys.length > 0);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// GET /table/rows/:connectionId - Pagination tests

test.serial(`GET /table/rows/:connectionId - Should return paginated rows for composite key table`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const { main_table } = testTablesCompositeKeysData;

		const perPage = 10;
		const getRowsPage1Response = await request(app.getHttpServer())
			.get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}&perPage=${perPage}&page=1`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getRowsPage1Response.status, 200);
		const page1RO = JSON.parse(getRowsPage1Response.text);
		t.truthy(page1RO.rows);
		t.is(page1RO.rows.length, perPage);
		t.truthy(page1RO.pagination);
		t.is(page1RO.pagination.currentPage, 1);
		t.is(page1RO.pagination.perPage, perPage);
		t.truthy(page1RO.pagination.total >= 42);

		const getRowsPage2Response = await request(app.getHttpServer())
			.get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}&perPage=${perPage}&page=2`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getRowsPage2Response.status, 200);
		const page2RO = JSON.parse(getRowsPage2Response.text);
		t.truthy(page2RO.rows);
		t.is(page2RO.rows.length, perPage);
		t.is(page2RO.pagination.currentPage, 2);

		const page1OrderIds = page1RO.rows.map((r: any) => r.order_id);
		const page2OrderIds = page2RO.rows.map((r: any) => r.order_id);
		for (const id of page2OrderIds) {
			t.falsy(page1OrderIds.includes(id), 'Page 2 rows should not overlap with page 1');
		}
	} catch (e) {
		console.error(e);
		throw e;
	}
});

// POST /table/row/:connectionId - Add row

test.serial(`POST /table/row/:connectionId - Should add a new row to composite primary key table`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const { main_table } = testTablesCompositeKeysData;

		const newRow = {
			order_id: 9999,
			customer_id: 9999,
			order_date: '2025-01-15',
			status: 'Pending',
			total_amount: 150.5,
		};

		const addRowResponse = await request(app.getHttpServer())
			.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send(newRow)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(addRowResponse.status, 201);
		const addRowRO = JSON.parse(addRowResponse.text);
		t.truthy(addRowRO.row);
		t.is(addRowRO.row.order_id, 9999);
		t.is(addRowRO.row.customer_id, 9999);
		t.is(addRowRO.row.status, 'Pending');
		t.truthy(addRowRO.structure);
		t.truthy(addRowRO.primaryColumns);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`POST /table/row/:connectionId - Should add a new row to simple foreign key referenced table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table, first_referenced_table } = testTablesSimpleKeysData;

			// First get an existing customer_id
			const getMainRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}&perPage=1`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const mainRowsRO = JSON.parse(getMainRowsResponse.text);
			const existingCustomerId = mainRowsRO.rows[0].customer_id;

			const newOrder = {
				customer_id: existingCustomerId,
				order_date: '2025-03-01',
				status: 'Shipped',
				total_amount: 250.0,
			};

			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send(newOrder)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(addRowResponse.status, 201);
			const addRowRO = JSON.parse(addRowResponse.text);
			t.truthy(addRowRO.row);
			t.truthy(addRowRO.row.order_id);
			t.is(addRowRO.row.status, 'Shipped');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// GET /table/row/:connectionId - Get single row

test.serial(`GET /table/row/:connectionId - Should return a single row by composite primary key`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const { main_table } = testTablesCompositeKeysData;

		const getRowResponse = await request(app.getHttpServer())
			.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=1&customer_id=100`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getRowResponse.status, 200);
		const getRowRO = JSON.parse(getRowResponse.text);
		t.truthy(getRowRO.row);
		t.is(getRowRO.row.order_id, 1);
		t.is(getRowRO.row.customer_id, 100);
		t.truthy(getRowRO.row.status);
		t.truthy(getRowRO.structure);
		t.truthy(getRowRO.primaryColumns);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`GET /table/row/:connectionId - Should return a single row by simple primary key from referenced table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { first_referenced_table } = testTablesSimpleKeysData;

			const getRowResponse = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&order_id=1`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowResponse.status, 200);
			const getRowRO = JSON.parse(getRowResponse.text);
			t.truthy(getRowRO.row);
			t.truthy(getRowRO.row.order_id);
			t.truthy(getRowRO.row.customer_id);
			t.truthy(getRowRO.structure);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// PUT /table/row/:connectionId - Update row

test.serial(`PUT /table/row/:connectionId - Should update a row in composite primary key table`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const { main_table } = testTablesCompositeKeysData;

		const updatedValues = {
			status: 'Delivered',
			total_amount: 999.99,
		};

		const updateRowResponse = await request(app.getHttpServer())
			.put(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=1&customer_id=100`)
			.send(updatedValues)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(updateRowResponse.status, 200);
		const updateRowRO = JSON.parse(updateRowResponse.text);
		t.truthy(updateRowRO.row);
		t.is(updateRowRO.row.status, 'Delivered');
		t.is(parseFloat(updateRowRO.row.total_amount), 999.99);
		t.is(updateRowRO.row.order_id, 1);
		t.is(updateRowRO.row.customer_id, 100);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`PUT /table/row/:connectionId - Should update a row in simple primary key referenced table`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const { main_table } = testTablesSimpleKeysData;

		const updatedValues = {
			name: 'Updated Customer Name',
			email: 'updated@test.com',
		};

		const updateRowResponse = await request(app.getHttpServer())
			.put(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&customer_id=1`)
			.send(updatedValues)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(updateRowResponse.status, 200);
		const updateRowRO = JSON.parse(updateRowResponse.text);
		t.truthy(updateRowRO.row);
		t.is(updateRowRO.row.name, 'Updated Customer Name');
		t.is(updateRowRO.row.email, 'updated@test.com');
	} catch (e) {
		console.error(e);
		throw e;
	}
});

// DELETE /table/row/:connectionId - Delete row

test.serial(`DELETE /table/row/:connectionId - Should delete a row from composite primary key table`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const { main_table } = testTablesCompositeKeysData;

		// Delete the row we added earlier (9999, 9999)
		const deleteRowResponse = await request(app.getHttpServer())
			.delete(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=9999&customer_id=9999`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(deleteRowResponse.status, 200);
		const deleteRowRO = JSON.parse(deleteRowResponse.text);
		t.truthy(deleteRowRO.row);

		// Verify the row is deleted
		const getDeletedRowResponse = await request(app.getHttpServer())
			.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=9999&customer_id=9999`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getDeletedRowResponse.status, 400);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

// PUT /table/rows/delete/:connectionId - Bulk delete

test.serial(
	`PUT /table/rows/delete/:connectionId - Should bulk delete rows from composite primary key table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table } = testTablesCompositeKeysData;

			// First add rows to delete
			const rowsToAdd = [
				{ order_id: 8881, customer_id: 8881, status: 'Pending', total_amount: 10.0 },
				{ order_id: 8882, customer_id: 8882, status: 'Pending', total_amount: 20.0 },
				{ order_id: 8883, customer_id: 8883, status: 'Pending', total_amount: 30.0 },
			];

			for (const row of rowsToAdd) {
				const addResp = await request(app.getHttpServer())
					.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
					.send(row)
					.set('Cookie', firstUserToken)
					.set('Content-Type', 'application/json')
					.set('Accept', 'application/json');
				t.is(addResp.status, 201);
			}

			const primaryKeysToDelete = [
				{ order_id: 8881, customer_id: 8881 },
				{ order_id: 8882, customer_id: 8882 },
				{ order_id: 8883, customer_id: 8883 },
			];

			const bulkDeleteResponse = await request(app.getHttpServer())
				.put(`/table/rows/delete/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(primaryKeysToDelete)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(bulkDeleteResponse.status, 200);

			// Verify rows are deleted
			for (const pk of primaryKeysToDelete) {
				const getResp = await request(app.getHttpServer())
					.get(
						`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=${pk.order_id}&customer_id=${pk.customer_id}`,
					)
					.set('Cookie', firstUserToken)
					.set('Content-Type', 'application/json')
					.set('Accept', 'application/json');
				t.is(getResp.status, 400);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// PUT /table/rows/update/:connectionId - Bulk update

test.serial(
	`PUT /table/rows/update/:connectionId - Should bulk update rows in composite primary key table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table } = testTablesCompositeKeysData;

			const bulkUpdateBody = {
				primaryKeys: [
					{ order_id: 2, customer_id: 101 },
					{ order_id: 3, customer_id: 102 },
				],
				newValues: {
					status: 'Cancelled',
				},
			};

			const bulkUpdateResponse = await request(app.getHttpServer())
				.put(`/table/rows/update/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(bulkUpdateBody)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(bulkUpdateResponse.status, 200);

			// Verify rows are updated
			const getRow1Response = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=2&customer_id=101`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRow1Response.status, 200);
			const row1RO = JSON.parse(getRow1Response.text);
			t.is(row1RO.row.status, 'Cancelled');

			const getRow2Response = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=3&customer_id=102`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRow2Response.status, 200);
			const row2RO = JSON.parse(getRow2Response.text);
			t.is(row2RO.row.status, 'Cancelled');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// POST /table/rows/find/:connectionId - Rows with body filters

test.serial(`POST /table/rows/find/:connectionId - Should return filtered rows for composite key table`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const { main_table } = testTablesCompositeKeysData;

		const filterBody = {
			filters: {
				order_id: { eq: 1 },
			},
		};

		const findRowsResponse = await request(app.getHttpServer())
			.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send(filterBody)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findRowsResponse.status, 201);
		const findRowsRO = JSON.parse(findRowsResponse.text);
		t.truthy(findRowsRO.rows);
		t.is(findRowsRO.rows.length, 1);
		t.is(findRowsRO.rows[0].order_id, 1);
		t.is(findRowsRO.rows[0].customer_id, 100);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`POST /table/rows/find/:connectionId - Should return rows filtered by status for composite key table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table } = testTablesCompositeKeysData;

			const filterBody = {
				filters: {
					status: { eq: 'Cancelled' },
				},
			};

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(filterBody)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 201);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.is(row.status, 'Cancelled');
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// GET /connection/tables/:connectionId - List tables

test.serial(`GET /connection/tables/:connectionId - Should list all complex test tables in connection`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const getTablesResponse = await request(app.getHttpServer())
			.get(`/connection/tables/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getTablesResponse.status, 200);
		const tablesRO = JSON.parse(getTablesResponse.text);
		t.truthy(Array.isArray(tablesRO));

		const tableNames = tablesRO.map((t: any) => t.table);

		const { main_table: compositeMain } = testTablesCompositeKeysData;
		const { main_table: simpleMain } = testTablesSimpleKeysData;

		t.truthy(tableNames.includes(compositeMain.table_name), `Tables should include ${compositeMain.table_name}`);
		t.truthy(tableNames.includes(simpleMain.table_name), `Tables should include ${simpleMain.table_name}`);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

// GET /table/rows/:connectionId - Response structure validation

test.serial(
	`GET /table/rows/:connectionId - Should return correct response structure with primaryColumns and pagination for composite key table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table } = testTablesCompositeKeysData;

			const getRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowsResponse.status, 200);
			const rowsRO = JSON.parse(getRowsResponse.text);

			// Validate response has required fields
			t.truthy(rowsRO.rows);
			t.truthy(rowsRO.primaryColumns);
			t.truthy(rowsRO.pagination);

			// Validate primaryColumns includes both composite key columns
			const primaryColumnNames = rowsRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('order_id'));
			t.truthy(primaryColumnNames.includes('customer_id'));
			t.is(rowsRO.primaryColumns.length, 2);

			// Validate row data
			t.truthy(rowsRO.rows.length > 0);
			const firstRow = rowsRO.rows[0];
			t.truthy('order_id' in firstRow);
			t.truthy('customer_id' in firstRow);
			t.truthy('status' in firstRow);
			t.truthy('total_amount' in firstRow);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// Cascade delete behavior

test.serial(
	`DELETE /table/row/:connectionId - Should cascade delete referenced rows when deleting from main composite key table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table, first_referenced_table } = testTablesCompositeKeysData;

			// Add a new row to main table
			const newMainRow = {
				order_id: 7777,
				customer_id: 7777,
				status: 'Pending',
				total_amount: 100.0,
			};
			const addMainResp = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(newMainRow)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addMainResp.status, 201);

			// Add a referenced row
			const newReferencedRow = {
				order_id: 7777,
				customer_id: 7777,
				product_name: 'Test Product',
				quantity: 5,
				price_per_unit: 20.0,
			};
			const addRefResp = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send(newReferencedRow)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRefResp.status, 201);
			const addedRefRow = JSON.parse(addRefResp.text);
			const refRowItemId = addedRefRow.row.item_id;

			// Delete the main row (should cascade)
			const deleteResp = await request(app.getHttpServer())
				.delete(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=7777&customer_id=7777`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteResp.status, 200);

			// Verify referenced row is also deleted (CASCADE)
			const getRefResp = await request(app.getHttpServer())
				.get(
					`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&item_id=${refRowItemId}`,
				)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getRefResp.status, 400);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// Error cases

test.serial(`GET /table/rows/:connectionId - Should return error when tableName is missing`, async (t) => {
	try {
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		const getRowsResponse = await request(app.getHttpServer())
			.get(`/table/rows/${createConnectionRO.id}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getRowsResponse.status, 400);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`GET /table/row/:connectionId - Should return error when primary key is incomplete for composite key table`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table } = testTablesCompositeKeysData;

			// Only provide one part of composite key
			const getRowResponse = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&order_id=1`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Should fail because composite key requires both order_id and customer_id
			t.truthy(getRowResponse.status >= 400);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/row/:connectionId - Should return error when adding row with duplicate composite primary key`,
	async (t) => {
		try {
			const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.send(connectionToTestDB)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const createConnectionRO = JSON.parse(createConnectionResponse.text);
			t.is(createConnectionResponse.status, 201);

			const { main_table } = testTablesCompositeKeysData;

			// Try to add a row with existing composite key (1, 100)
			const duplicateRow = {
				order_id: 1,
				customer_id: 100,
				status: 'Duplicate',
				total_amount: 0,
			};

			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(duplicateRow)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.truthy(addRowResponse.status >= 400);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);
