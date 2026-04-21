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
	CompositeTypedKeyTableCreationResult,
	createTestTablesWithComplexPFKeys,
	createTestTablesWithCompositeDateIntKeys,
	createTestTablesWithCompositeUUIDIntKeys,
	createTestTablesWithCompositeUUIDKeys,
	createTestTablesWithSimpleAutoIncrementKeys,
	createTestTablesWithSimpleDateKeys,
	createTestTablesWithSimplePFKeys,
	createTestTablesWithSimpleUUIDKeys,
	SimpleTypedKeyTableCreationResult,
} from '../../utils/test-utilities/create-test-postgres-tables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const _testSearchedUserName = 'Vasia';
const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;

let testTablesCompositeKeysData: TableCreationResult;
let testTablesSimpleKeysData: TableCreationResult;
let testTablesSimpleUUIDData: SimpleTypedKeyTableCreationResult;
let testTablesSimpleDateData: SimpleTypedKeyTableCreationResult;
let testTablesCompositeUUIDData: CompositeTypedKeyTableCreationResult;
let testTablesCompositeUUIDIntData: CompositeTypedKeyTableCreationResult;
let testTablesCompositeDateIntData: CompositeTypedKeyTableCreationResult;
let testTablesSimpleAutoIncData: SimpleTypedKeyTableCreationResult;

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

	testTablesCompositeKeysData = await createTestTablesWithComplexPFKeys(connectionToTestDB);
	testTablesSimpleKeysData = await createTestTablesWithSimplePFKeys(connectionToTestDB);
	testTablesSimpleUUIDData = await createTestTablesWithSimpleUUIDKeys(connectionToTestDB);
	testTablesSimpleDateData = await createTestTablesWithSimpleDateKeys(connectionToTestDB);
	testTablesCompositeUUIDData = await createTestTablesWithCompositeUUIDKeys(connectionToTestDB);
	testTablesCompositeUUIDIntData = await createTestTablesWithCompositeUUIDIntKeys(connectionToTestDB);
	testTablesCompositeDateIntData = await createTestTablesWithCompositeDateIntKeys(connectionToTestDB);
	testTablesSimpleAutoIncData = await createTestTablesWithSimpleAutoIncrementKeys(connectionToTestDB);
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

		t.is(findRowsResponse.status, 200);
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

			t.is(findRowsResponse.status, 200);
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

// POST /table/rows/find/:connectionId - Filter operator combinations

test.serial(
	`POST /table/rows/find/:connectionId - Should return empty rows when eq filter matches nothing in simple table`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { order_id: { eq: 999999 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			t.is(findRowsRO.rows.length, 0);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by gt operator on total_amount in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { total_amount: { gt: 100 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(parseFloat(row.total_amount) > 100);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by lt operator on total_amount in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { total_amount: { lt: 200 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(parseFloat(row.total_amount) < 200);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by gte operator on total_amount in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { total_amount: { gte: 20 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(parseFloat(row.total_amount) >= 20);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by lte operator on total_amount in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { total_amount: { lte: 500 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(parseFloat(row.total_amount) <= 500);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by between operator on total_amount in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { total_amount: { between: [100, 300] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				const amount = parseFloat(row.total_amount);
				t.truthy(amount >= 100 && amount <= 300);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by in operator on status in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { status: { in: ['Pending', 'Shipped'] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(['Pending', 'Shipped'].includes(row.status));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by in operator on order_id array in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { order_id: { in: [10, 11, 12, 13, 14] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			t.is(findRowsRO.rows.length, 5);
			const returnedOrderIds = findRowsRO.rows.map((r: any) => r.order_id).sort();
			t.deepEqual(returnedOrderIds, [10, 11, 12, 13, 14]);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by combined gt and lt on total_amount in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { total_amount: { gt: 50, lt: 250 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				const amount = parseFloat(row.total_amount);
				t.truthy(amount > 50 && amount < 250);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by eq on customer_id foreign key in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { customer_id: { eq: 2 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				// customer_id may be returned as a referenced object
				const customerIdValue = typeof row.customer_id === 'object' ? row.customer_id.customer_id : row.customer_id;
				t.is(customerIdValue, 2);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by startswith operator on status in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { status: { startswith: 'P' } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(row.status.startsWith('P'));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by endswith operator on status in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { status: { endswith: 'ed' } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(row.status.endsWith('ed'));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by contains operator on status in simple orders`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { status: { contains: 'end' } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(row.status.includes('end'));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by contains operator on email in customers table`,
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

			const { main_table } = testTablesSimpleKeysData;

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { email: { contains: '@' } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			t.truthy(findRowsRO.rows.length > 0);
			for (const row of findRowsRO.rows) {
				t.truthy(row.email.includes('@'));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by in operator on customer_id in customers table`,
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

			const { main_table } = testTablesSimpleKeysData;

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { customer_id: { in: [2, 3, 4] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			t.is(findRowsRO.rows.length, 3);
			const returnedIds = findRowsRO.rows.map((r: any) => r.customer_id).sort();
			t.deepEqual(returnedIds, [2, 3, 4]);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by eq on both composite key columns in composite main table`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { order_id: { eq: 10 }, customer_id: { eq: 109 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			t.is(findRowsRO.rows.length, 1);
			t.is(findRowsRO.rows[0].order_id, 10);
			t.is(findRowsRO.rows[0].customer_id, 109);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by between on order_id in composite main table`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { order_id: { between: [5, 10] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			t.is(findRowsRO.rows.length, 6);
			for (const row of findRowsRO.rows) {
				t.truthy(row.order_id >= 5 && row.order_id <= 10);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by in operator on status in composite main table`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { status: { in: ['Delivered', 'Cancelled'] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(['Delivered', 'Cancelled'].includes(row.status));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by gt on order_id combined with in on status in composite main table`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({
					filters: {
						order_id: { gt: 20 },
						status: { in: ['Pending', 'Shipped', 'Delivered', 'Cancelled'] },
					},
				})
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(row.order_id > 20);
				t.truthy(['Pending', 'Shipped', 'Delivered', 'Cancelled'].includes(row.status));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`POST /table/rows/find/:connectionId - Should filter with pagination on simple orders`, async (t) => {
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
		const perPage = 5;

		const findRowsResponse = await request(app.getHttpServer())
			.post(
				`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&page=1&perPage=${perPage}`,
			)
			.send({ filters: { total_amount: { gt: 0 } } })
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findRowsResponse.status, 200);
		const findRowsRO = JSON.parse(findRowsResponse.text);
		t.truthy(findRowsRO.rows);
		t.truthy(findRowsRO.rows.length <= perPage);
		t.truthy(findRowsRO.pagination);
		t.is(findRowsRO.pagination.currentPage, 1);
		t.is(findRowsRO.pagination.perPage, perPage);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`POST /table/rows/find/:connectionId - Should return all rows when filters is empty object`, async (t) => {
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

		const findRowsResponse = await request(app.getHttpServer())
			.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
			.send({ filters: {} })
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findRowsResponse.status, 200);
		const findRowsRO = JSON.parse(findRowsResponse.text);
		t.truthy(findRowsRO.rows);
		t.truthy(findRowsRO.rows.length > 0);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`POST /table/rows/find/:connectionId - Should filter by gte combined with lte for inclusive range on composite main table`,
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

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { customer_id: { gte: 100, lte: 105 } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			for (const row of findRowsRO.rows) {
				t.truthy(row.customer_id >= 100 && row.customer_id <= 105);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// Typed key tests: Simple UUID primary/foreign keys

test.serial(
	`GET /table/structure/:connectionId - Should return structure with uuid primary key for simple UUID table`,
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

			const { main_table } = testTablesSimpleUUIDData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			t.truthy(structureRO.primaryColumns);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('user_id'));
			t.is(structureRO.primaryColumns.length, 1);

			const userIdCol = structureRO.structure.find((col: any) => col.column_name === 'user_id');
			t.truthy(userIdCol);
			t.is(userIdCol.data_type, 'uuid');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/rows/:connectionId - Should return rows from simple UUID table with referenced user_id`,
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

			const { first_referenced_table } = testTablesSimpleUUIDData;

			const getRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowsResponse.status, 200);
			const rowsRO = JSON.parse(getRowsResponse.text);
			t.truthy(rowsRO.rows);
			t.truthy(rowsRO.rows.length > 0);
			for (const row of rowsRO.rows) {
				t.is(typeof row.user_id, 'object');
				t.truthy(Object.hasOwn(row.user_id, 'user_id'));
				t.is(typeof row.user_id.user_id, 'string');
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`POST /table/row/:connectionId - Should add a new row to simple UUID main table`, async (t) => {
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

		const { main_table } = testTablesSimpleUUIDData;

		const newUser = {
			user_id: '11111111-1111-1111-1111-111111111111',
			name: 'UUID Test User',
			email: 'uuid-user@test.com',
		};

		const addRowResponse = await request(app.getHttpServer())
			.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send(newUser)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(addRowResponse.status, 201);
		const addRowRO = JSON.parse(addRowResponse.text);
		t.is(addRowRO.row.user_id, '11111111-1111-1111-1111-111111111111');
		t.is(addRowRO.row.name, 'UUID Test User');
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`GET /table/row/:connectionId - Should return a single row by UUID primary key`, async (t) => {
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

		const { main_table } = testTablesSimpleUUIDData;
		const sampleUserId = main_table.sample_primary_key_values[0];

		const getRowResponse = await request(app.getHttpServer())
			.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&user_id=${sampleUserId}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getRowResponse.status, 200);
		const getRowRO = JSON.parse(getRowResponse.text);
		t.truthy(getRowRO.row);
		t.is(getRowRO.row.user_id, sampleUserId);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`POST /table/rows/find/:connectionId - Should find rows by UUID primary key using eq`, async (t) => {
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

		const { main_table } = testTablesSimpleUUIDData;
		const sampleUserId = main_table.sample_primary_key_values[1];

		const findRowsResponse = await request(app.getHttpServer())
			.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send({ filters: { user_id: { eq: sampleUserId } } })
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findRowsResponse.status, 200);
		const findRowsRO = JSON.parse(findRowsResponse.text);
		t.is(findRowsRO.rows.length, 1);
		t.is(findRowsRO.rows[0].user_id, sampleUserId);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`POST /table/rows/find/:connectionId - Should find rows by UUID foreign key in simple UUID referenced table`,
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

			const { main_table, first_referenced_table } = testTablesSimpleUUIDData;
			const sampleUserId = main_table.sample_primary_key_values[2];

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { user_id: { eq: sampleUserId } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows.length > 0);
			for (const row of findRowsRO.rows) {
				const userIdValue = typeof row.user_id === 'object' ? row.user_id.user_id : row.user_id;
				t.is(userIdValue, sampleUserId);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// Typed key tests: Simple DATE primary/foreign keys

test.serial(
	`GET /table/structure/:connectionId - Should return structure with date primary key for simple DATE table`,
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

			const { main_table } = testTablesSimpleDateData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('event_date'));
			t.is(structureRO.primaryColumns.length, 1);

			const dateCol = structureRO.structure.find((col: any) => col.column_name === 'event_date');
			t.truthy(dateCol);
			t.is(dateCol.data_type, 'date');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/rows/:connectionId - Should return rows from simple DATE referenced table with referenced event_date`,
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

			const { first_referenced_table } = testTablesSimpleDateData;

			const getRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowsResponse.status, 200);
			const rowsRO = JSON.parse(getRowsResponse.text);
			t.truthy(rowsRO.rows.length > 0);
			for (const row of rowsRO.rows) {
				t.truthy(row.event_date !== null && row.event_date !== undefined);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`POST /table/row/:connectionId - Should add a new row to simple DATE main table`, async (t) => {
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

		const { main_table } = testTablesSimpleDateData;

		const newEvent = {
			event_date: '2030-01-01',
			name: 'New Year 2030',
			description: 'A future event',
		};

		const addRowResponse = await request(app.getHttpServer())
			.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send(newEvent)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(addRowResponse.status, 201);
		const addRowRO = JSON.parse(addRowResponse.text);
		t.is(addRowRO.row.name, 'New Year 2030');
		t.truthy(addRowRO.row.event_date);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`GET /table/row/:connectionId - Should return a single row by DATE primary key`, async (t) => {
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

		const { main_table } = testTablesSimpleDateData;
		const sampleDate = main_table.sample_primary_key_values[0];

		const getRowResponse = await request(app.getHttpServer())
			.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&event_date=${sampleDate}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getRowResponse.status, 200);
		const getRowRO = JSON.parse(getRowResponse.text);
		t.truthy(getRowRO.row);
		t.truthy(getRowRO.row.event_date);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`POST /table/rows/find/:connectionId - Should find rows by DATE primary key using eq`, async (t) => {
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

		const { main_table } = testTablesSimpleDateData;
		const sampleDate = main_table.sample_primary_key_values[1];

		const findRowsResponse = await request(app.getHttpServer())
			.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send({ filters: { event_date: { eq: sampleDate } } })
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findRowsResponse.status, 200);
		const findRowsRO = JSON.parse(findRowsResponse.text);
		t.is(findRowsRO.rows.length, 1);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`POST /table/rows/find/:connectionId - Should find rows by DATE range using between`, async (t) => {
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

		const { main_table } = testTablesSimpleDateData;

		const findRowsResponse = await request(app.getHttpServer())
			.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send({ filters: { event_date: { between: ['2025-01-01', '2025-01-05'] } } })
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findRowsResponse.status, 200);
		const findRowsRO = JSON.parse(findRowsResponse.text);
		t.is(findRowsRO.rows.length, 5);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

// Typed key tests: Composite UUID primary/foreign keys

test.serial(
	`GET /table/structure/:connectionId - Should return structure with composite UUID primary keys`,
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

			const { main_table } = testTablesCompositeUUIDData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('account_id'));
			t.truthy(primaryColumnNames.includes('tenant_id'));
			t.is(structureRO.primaryColumns.length, 2);

			const accountIdCol = structureRO.structure.find((col: any) => col.column_name === 'account_id');
			const tenantIdCol = structureRO.structure.find((col: any) => col.column_name === 'tenant_id');
			t.is(accountIdCol.data_type, 'uuid');
			t.is(tenantIdCol.data_type, 'uuid');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`POST /table/row/:connectionId - Should add a new row with composite UUID primary key`, async (t) => {
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

		const { main_table } = testTablesCompositeUUIDData;

		const newAccount = {
			account_id: '22222222-2222-2222-2222-222222222222',
			tenant_id: '33333333-3333-3333-3333-333333333333',
			account_name: 'Test UUID Account',
			balance: 1000.0,
		};

		const addRowResponse = await request(app.getHttpServer())
			.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send(newAccount)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(addRowResponse.status, 201);
		const addRowRO = JSON.parse(addRowResponse.text);
		t.is(addRowRO.row.account_id, '22222222-2222-2222-2222-222222222222');
		t.is(addRowRO.row.tenant_id, '33333333-3333-3333-3333-333333333333');
		t.is(addRowRO.row.account_name, 'Test UUID Account');
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`GET /table/row/:connectionId - Should return a single row by composite UUID primary key`, async (t) => {
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

		const { main_table } = testTablesCompositeUUIDData;
		const sample = main_table.sample_primary_key_rows[0];

		const getRowResponse = await request(app.getHttpServer())
			.get(
				`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&account_id=${sample.account_id}&tenant_id=${sample.tenant_id}`,
			)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getRowResponse.status, 200);
		const getRowRO = JSON.parse(getRowResponse.text);
		t.is(getRowRO.row.account_id, sample.account_id);
		t.is(getRowRO.row.tenant_id, sample.tenant_id);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`POST /table/rows/find/:connectionId - Should find row by composite UUID primary key using eq on both columns`,
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

			const { main_table } = testTablesCompositeUUIDData;
			const sample = main_table.sample_primary_key_rows[1];

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({
					filters: {
						account_id: { eq: sample.account_id },
						tenant_id: { eq: sample.tenant_id },
					},
				})
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.is(findRowsRO.rows.length, 1);
			t.is(findRowsRO.rows[0].account_id, sample.account_id);
			t.is(findRowsRO.rows[0].tenant_id, sample.tenant_id);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/rows/:connectionId - Should return rows from composite UUID referenced table with referenced composite UUIDs`,
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

			const { first_referenced_table } = testTablesCompositeUUIDData;

			const getRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowsResponse.status, 200);
			const rowsRO = JSON.parse(getRowsResponse.text);
			t.truthy(rowsRO.rows.length > 0);
			for (const row of rowsRO.rows) {
				t.is(typeof row.account_id, 'object');
				t.truthy(Object.hasOwn(row.account_id, 'account_id'));
				t.is(typeof row.tenant_id, 'object');
				t.truthy(Object.hasOwn(row.tenant_id, 'tenant_id'));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// Typed key tests: Composite UUID+INTEGER primary/foreign keys

test.serial(
	`GET /table/structure/:connectionId - Should return structure with composite UUID+integer primary keys`,
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

			const { main_table } = testTablesCompositeUUIDIntData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('session_token'));
			t.truthy(primaryColumnNames.includes('user_id'));
			t.is(structureRO.primaryColumns.length, 2);

			const sessionCol = structureRO.structure.find((col: any) => col.column_name === 'session_token');
			const userCol = structureRO.structure.find((col: any) => col.column_name === 'user_id');
			t.is(sessionCol.data_type, 'uuid');
			t.is(userCol.data_type, 'integer');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/row/:connectionId - Should add a new row with composite UUID+integer primary key`,
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

			const { main_table } = testTablesCompositeUUIDIntData;

			const newSession = {
				session_token: '44444444-4444-4444-4444-444444444444',
				user_id: 5555,
				device: 'Web',
			};

			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(newSession)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(addRowResponse.status, 201);
			const addRowRO = JSON.parse(addRowResponse.text);
			t.is(addRowRO.row.session_token, '44444444-4444-4444-4444-444444444444');
			t.is(addRowRO.row.user_id, 5555);
			t.is(addRowRO.row.device, 'Web');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/row/:connectionId - Should return a single row by composite UUID+integer primary key`,
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

			const { main_table } = testTablesCompositeUUIDIntData;
			const sample = main_table.sample_primary_key_rows[0];

			const getRowResponse = await request(app.getHttpServer())
				.get(
					`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&session_token=${sample.session_token}&user_id=${sample.user_id}`,
				)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowResponse.status, 200);
			const getRowRO = JSON.parse(getRowResponse.text);
			t.is(getRowRO.row.session_token, sample.session_token);
			t.is(getRowRO.row.user_id, sample.user_id);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should find row by composite UUID+integer using eq on both columns`,
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

			const { main_table } = testTablesCompositeUUIDIntData;
			const sample = main_table.sample_primary_key_rows[1];

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({
					filters: {
						session_token: { eq: sample.session_token },
						user_id: { eq: sample.user_id },
					},
				})
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.is(findRowsRO.rows.length, 1);
			t.is(findRowsRO.rows[0].session_token, sample.session_token);
			t.is(findRowsRO.rows[0].user_id, sample.user_id);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should find rows by integer range on composite UUID+integer table`,
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

			const { main_table } = testTablesCompositeUUIDIntData;

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { user_id: { between: [1000, 1005] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.is(findRowsRO.rows.length, 6);
			for (const row of findRowsRO.rows) {
				t.truthy(row.user_id >= 1000 && row.user_id <= 1005);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// Typed key tests: Composite DATE+INTEGER primary/foreign keys

test.serial(
	`GET /table/structure/:connectionId - Should return structure with composite DATE+integer primary keys`,
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

			const { main_table } = testTablesCompositeDateIntData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('stat_date'));
			t.truthy(primaryColumnNames.includes('category_id'));
			t.is(structureRO.primaryColumns.length, 2);

			const dateCol = structureRO.structure.find((col: any) => col.column_name === 'stat_date');
			const catCol = structureRO.structure.find((col: any) => col.column_name === 'category_id');
			t.is(dateCol.data_type, 'date');
			t.is(catCol.data_type, 'integer');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/row/:connectionId - Should add a new row with composite DATE+integer primary key`,
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

			const { main_table } = testTablesCompositeDateIntData;

			const newStat = {
				stat_date: '2030-12-31',
				category_id: 9999,
				total_count: 100,
				total_value: 1234.56,
			};

			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(newStat)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(addRowResponse.status, 201);
			const addRowRO = JSON.parse(addRowResponse.text);
			t.is(addRowRO.row.category_id, 9999);
			t.is(addRowRO.row.total_count, 100);
			t.truthy(addRowRO.row.stat_date);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/row/:connectionId - Should return a single row by composite DATE+integer primary key`,
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

			const { main_table } = testTablesCompositeDateIntData;
			const sample = main_table.sample_primary_key_rows[0];

			const getRowResponse = await request(app.getHttpServer())
				.get(
					`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&stat_date=${sample.stat_date}&category_id=${sample.category_id}`,
				)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowResponse.status, 200);
			const getRowRO = JSON.parse(getRowResponse.text);
			t.is(getRowRO.row.category_id, sample.category_id);
			t.truthy(getRowRO.row.stat_date);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should find row by composite DATE+integer using eq on both columns`,
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

			const { main_table } = testTablesCompositeDateIntData;
			const sample = main_table.sample_primary_key_rows[1];

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({
					filters: {
						stat_date: { eq: sample.stat_date },
						category_id: { eq: sample.category_id },
					},
				})
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.is(findRowsRO.rows.length, 1);
			t.is(findRowsRO.rows[0].category_id, sample.category_id);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should find rows by DATE between combined with integer in on composite table`,
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

			const { main_table } = testTablesCompositeDateIntData;

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({
					filters: {
						stat_date: { between: ['2025-06-01', '2025-06-05'] },
						category_id: { in: [500, 501, 502, 503, 504] },
					},
				})
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.is(findRowsRO.rows.length, 5);
			for (const row of findRowsRO.rows) {
				t.truthy([500, 501, 502, 503, 504].includes(row.category_id));
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

// Typed key tests: Simple auto-increment integer primary/foreign keys

test.serial(
	`GET /table/structure/:connectionId - Should return structure with auto-increment integer primary key`,
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

			const { main_table } = testTablesSimpleAutoIncData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('product_id'));
			t.is(structureRO.primaryColumns.length, 1);

			const productIdCol = structureRO.structure.find((col: any) => col.column_name === 'product_id');
			t.truthy(productIdCol);
			t.is(productIdCol.data_type, 'integer');
			// Auto-increment columns use a nextval sequence as column_default in postgres
			t.truthy(productIdCol.column_default && String(productIdCol.column_default).includes('nextval'));
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/row/:connectionId - Should add a new row without providing auto-increment product_id`,
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

			const { main_table } = testTablesSimpleAutoIncData;

			const newProduct = {
				product_name: 'Auto-assigned Product',
				sku: 'SKU-AUTO-001',
				price: 49.99,
			};

			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send(newProduct)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(addRowResponse.status, 201);
			const addRowRO = JSON.parse(addRowResponse.text);
			t.truthy(addRowRO.row.product_id);
			t.is(typeof addRowRO.row.product_id, 'number');
			t.truthy(addRowRO.row.product_id > 0);
			t.is(addRowRO.row.product_name, 'Auto-assigned Product');
			t.is(addRowRO.row.sku, 'SKU-AUTO-001');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/row/:connectionId - Should assign sequential auto-increment ids on successive inserts`,
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

			const { main_table } = testTablesSimpleAutoIncData;

			const first = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ product_name: 'Seq A', sku: 'SEQ-A', price: 1.0 })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(first.status, 201);

			const second = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ product_name: 'Seq B', sku: 'SEQ-B', price: 2.0 })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(second.status, 201);

			const firstId = JSON.parse(first.text).row.product_id;
			const secondId = JSON.parse(second.text).row.product_id;
			t.truthy(secondId > firstId);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/row/:connectionId - Should return a single row by auto-increment integer primary key`,
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

			const { main_table } = testTablesSimpleAutoIncData;
			const sampleId = main_table.sample_primary_key_values[0];

			const getRowResponse = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&product_id=${sampleId}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowResponse.status, 200);
			const getRowRO = JSON.parse(getRowResponse.text);
			t.is(getRowRO.row.product_id, sampleId);
			t.truthy(getRowRO.row.product_name);
			t.truthy(getRowRO.row.sku);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`PUT /table/row/:connectionId - Should update a row by auto-increment integer primary key`, async (t) => {
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

		const { main_table } = testTablesSimpleAutoIncData;
		const sampleId = main_table.sample_primary_key_values[1];

		const updateRowResponse = await request(app.getHttpServer())
			.put(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&product_id=${sampleId}`)
			.send({ product_name: 'Updated Product', price: 77.77 })
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(updateRowResponse.status, 200);
		const updateRowRO = JSON.parse(updateRowResponse.text);
		t.is(updateRowRO.row.product_id, sampleId);
		t.is(updateRowRO.row.product_name, 'Updated Product');
		t.is(parseFloat(updateRowRO.row.price), 77.77);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`DELETE /table/row/:connectionId - Should delete a row by auto-increment integer primary key`,
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

			const { main_table, first_referenced_table } = testTablesSimpleAutoIncData;

			// Insert a standalone product without any reviews so it can be safely deleted
			const addResp = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ product_name: 'Deletable Product', sku: 'SKU-DELETE-001', price: 9.99 })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addResp.status, 201);
			const newProductId = JSON.parse(addResp.text).row.product_id;

			// Confirm no reviews reference the new product
			const findReviewsResp = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { product_id: { eq: newProductId } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(findReviewsResp.status, 200);
			t.is(JSON.parse(findReviewsResp.text).rows.length, 0);

			const deleteResp = await request(app.getHttpServer())
				.delete(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&product_id=${newProductId}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteResp.status, 200);

			const getDeletedResp = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}&product_id=${newProductId}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getDeletedResp.status, 400);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should find row by auto-increment primary key using eq`,
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

			const { main_table } = testTablesSimpleAutoIncData;
			const sampleId = main_table.sample_primary_key_values[2];

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { product_id: { eq: sampleId } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.is(findRowsRO.rows.length, 1);
			t.is(findRowsRO.rows[0].product_id, sampleId);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should find rows by auto-increment id range using between`,
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

			const { main_table } = testTablesSimpleAutoIncData;
			const ids = main_table.sample_primary_key_values as number[];
			const low = ids[0];
			const high = ids[3];

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.send({ filters: { product_id: { between: [low, high] } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows.length >= 4);
			for (const row of findRowsRO.rows) {
				t.truthy(row.product_id >= low && row.product_id <= high);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should find rows in auto-increment FK referenced table by foreign product_id`,
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

			const { main_table, first_referenced_table } = testTablesSimpleAutoIncData;
			const sampleId = main_table.sample_primary_key_values[0];

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send({ filters: { product_id: { eq: sampleId } } })
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows.length > 0);
			for (const row of findRowsRO.rows) {
				const productIdValue = typeof row.product_id === 'object' ? row.product_id.product_id : row.product_id;
				t.is(productIdValue, sampleId);
			}
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

// Additional simple primary/foreign key tests

test.serial(
	`GET /table/structure/:connectionId - Should return table structure for simple primary key main table`,
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

			const { main_table } = testTablesSimpleKeysData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			t.truthy(structureRO.structure);
			t.truthy(Array.isArray(structureRO.structure));

			const columnNames = structureRO.structure.map((col: any) => col.column_name);
			t.truthy(columnNames.includes('customer_id'));
			t.truthy(columnNames.includes('name'));
			t.truthy(columnNames.includes('email'));
			t.truthy(columnNames.includes('created_at'));

			t.truthy(structureRO.primaryColumns);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('customer_id'));
			t.is(structureRO.primaryColumns.length, 1);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/structure/:connectionId - Should return structure for simple foreign key referenced table (orders)`,
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

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			t.truthy(structureRO.structure);

			const columnNames = structureRO.structure.map((col: any) => col.column_name);
			t.truthy(columnNames.includes('order_id'));
			t.truthy(columnNames.includes('customer_id'));
			t.truthy(columnNames.includes('order_date'));
			t.truthy(columnNames.includes('status'));
			t.truthy(columnNames.includes('total_amount'));

			t.truthy(structureRO.primaryColumns);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('order_id'));
			t.is(structureRO.primaryColumns.length, 1);

			t.truthy(structureRO.foreignKeys);
			t.truthy(structureRO.foreignKeys.length > 0);
			const customerFk = structureRO.foreignKeys.find((fk: any) => fk.column_name === 'customer_id');
			t.truthy(customerFk, 'Should expose customer_id foreign key');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/structure/:connectionId - Should return structure for simple foreign key second referenced table (shipments)`,
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

			const { second_referenced_table } = testTablesSimpleKeysData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${second_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			t.truthy(structureRO.structure);

			const columnNames = structureRO.structure.map((col: any) => col.column_name);
			t.truthy(columnNames.includes('shipment_id'));
			t.truthy(columnNames.includes('order_id'));
			t.truthy(columnNames.includes('carrier'));
			t.truthy(columnNames.includes('tracking_number'));

			t.truthy(structureRO.foreignKeys);
			const orderFk = structureRO.foreignKeys.find((fk: any) => fk.column_name === 'order_id');
			t.truthy(orderFk, 'Should expose order_id foreign key');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/structure/:connectionId - Should return structure for composite foreign key second referenced table (shipments)`,
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

			const { second_referenced_table } = testTablesCompositeKeysData;

			const getStructureResponse = await request(app.getHttpServer())
				.get(`/table/structure/${createConnectionRO.id}?tableName=${second_referenced_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getStructureResponse.status, 200);
			const structureRO = JSON.parse(getStructureResponse.text);
			t.truthy(structureRO.structure);

			const columnNames = structureRO.structure.map((col: any) => col.column_name);
			t.truthy(columnNames.includes('shipment_id'));
			t.truthy(columnNames.includes('order_id'));
			t.truthy(columnNames.includes('customer_id'));
			t.truthy(columnNames.includes('carrier'));

			t.truthy(structureRO.primaryColumns);
			const primaryColumnNames = structureRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('shipment_id'));

			t.truthy(structureRO.foreignKeys);
			const fkColumns = structureRO.foreignKeys.map((fk: any) => fk.column_name);
			t.truthy(fkColumns.includes('order_id'));
			t.truthy(fkColumns.includes('customer_id'));
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`GET /table/rows/:connectionId - Should return paginated rows for simple primary key table`, async (t) => {
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

		const perPage = 10;
		const getPage1Response = await request(app.getHttpServer())
			.get(
				`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&perPage=${perPage}&page=1`,
			)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getPage1Response.status, 200);
		const page1RO = JSON.parse(getPage1Response.text);
		t.truthy(page1RO.rows);
		t.is(page1RO.rows.length, perPage);
		t.is(page1RO.pagination.currentPage, 1);
		t.is(page1RO.pagination.perPage, perPage);

		const getPage2Response = await request(app.getHttpServer())
			.get(
				`/table/rows/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&perPage=${perPage}&page=2`,
			)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getPage2Response.status, 200);
		const page2RO = JSON.parse(getPage2Response.text);
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

test.serial(`POST /table/row/:connectionId - Should add a new row to simple primary key main table`, async (t) => {
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

		const newCustomer = {
			name: 'New Simple Customer',
			email: 'new-simple-customer@test.com',
		};

		const addRowResponse = await request(app.getHttpServer())
			.post(`/table/row/${createConnectionRO.id}?tableName=${main_table.table_name}`)
			.send(newCustomer)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(addRowResponse.status, 201);
		const addRowRO = JSON.parse(addRowResponse.text);
		t.truthy(addRowRO.row);
		t.is(addRowRO.row.name, 'New Simple Customer');
		t.is(addRowRO.row.email, 'new-simple-customer@test.com');
		t.truthy(addRowRO.row.customer_id);
		t.truthy(addRowRO.primaryColumns);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`POST /table/row/:connectionId - Should add a new shipment with composite foreign key`, async (t) => {
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

		const { second_referenced_table } = testTablesCompositeKeysData;

		const newShipment = {
			order_id: 5,
			customer_id: 104,
			shipped_date: '2025-05-01',
			carrier: 'Test Carrier',
			tracking_number: 'TRK-COMPOSITE-001',
		};

		const addRowResponse = await request(app.getHttpServer())
			.post(`/table/row/${createConnectionRO.id}?tableName=${second_referenced_table.table_name}`)
			.send(newShipment)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(addRowResponse.status, 201);
		const addRowRO = JSON.parse(addRowResponse.text);
		t.truthy(addRowRO.row);
		t.is(addRowRO.row.carrier, 'Test Carrier');
		t.is(addRowRO.row.tracking_number, 'TRK-COMPOSITE-001');
		t.truthy(addRowRO.row.shipment_id);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`DELETE /table/row/:connectionId - Should delete a row from simple primary key referenced table`,
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

			const deleteRowResponse = await request(app.getHttpServer())
				.delete(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&order_id=40`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(deleteRowResponse.status, 200);

			const getDeletedRowResponse = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&order_id=40`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getDeletedRowResponse.status, 400);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`PUT /table/rows/delete/:connectionId - Should bulk delete rows from simple primary key referenced table`,
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

			const primaryKeysToDelete = [{ order_id: 35 }, { order_id: 36 }, { order_id: 37 }];

			const bulkDeleteResponse = await request(app.getHttpServer())
				.put(`/table/rows/delete/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send(primaryKeysToDelete)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(bulkDeleteResponse.status, 200);

			for (const pk of primaryKeysToDelete) {
				const getResp = await request(app.getHttpServer())
					.get(
						`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&order_id=${pk.order_id}`,
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

test.serial(
	`PUT /table/rows/update/:connectionId - Should bulk update rows in simple primary key referenced table`,
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

			const bulkUpdateBody = {
				primaryKeys: [{ order_id: 25 }, { order_id: 26 }],
				newValues: {
					status: 'Refunded',
				},
			};

			const bulkUpdateResponse = await request(app.getHttpServer())
				.put(`/table/rows/update/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send(bulkUpdateBody)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(bulkUpdateResponse.status, 200);

			const getRow1Response = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&order_id=25`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRow1Response.status, 200);
			const row1RO = JSON.parse(getRow1Response.text);
			t.is(row1RO.row.status, 'Refunded');

			const getRow2Response = await request(app.getHttpServer())
				.get(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}&order_id=26`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRow2Response.status, 200);
			const row2RO = JSON.parse(getRow2Response.text);
			t.is(row2RO.row.status, 'Refunded');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/rows/find/:connectionId - Should return filtered rows for simple primary key referenced table`,
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

			const filterBody = {
				filters: {
					order_id: { eq: 5 },
				},
			};

			const findRowsResponse = await request(app.getHttpServer())
				.post(`/table/rows/find/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send(filterBody)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findRowsResponse.status, 200);
			const findRowsRO = JSON.parse(findRowsResponse.text);
			t.truthy(findRowsRO.rows);
			t.is(findRowsRO.rows.length, 1);
			t.is(findRowsRO.rows[0].order_id, 5);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`GET /table/rows/:connectionId - Should return correct response structure with primaryColumns for simple key table`,
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

			const { main_table } = testTablesSimpleKeysData;

			const getRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${createConnectionRO.id}?tableName=${main_table.table_name}`)
				.set('Cookie', firstUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getRowsResponse.status, 200);
			const rowsRO = JSON.parse(getRowsResponse.text);

			t.truthy(rowsRO.rows);
			t.truthy(rowsRO.primaryColumns);
			t.truthy(rowsRO.pagination);

			const primaryColumnNames = rowsRO.primaryColumns.map((col: any) => col.column_name);
			t.truthy(primaryColumnNames.includes('customer_id'));
			t.is(rowsRO.primaryColumns.length, 1);

			t.truthy(rowsRO.rows.length > 0);
			const firstRow = rowsRO.rows[0];
			t.truthy('customer_id' in firstRow);
			t.truthy('name' in firstRow);
			t.truthy('email' in firstRow);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`POST /table/row/:connectionId - Should return error when adding order with non-existent simple foreign key`,
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

			const invalidOrder = {
				customer_id: 999999,
				order_date: '2025-04-01',
				status: 'Pending',
				total_amount: 99.99,
			};

			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${createConnectionRO.id}?tableName=${first_referenced_table.table_name}`)
				.send(invalidOrder)
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
