/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { QueryOrderingEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { CreatePersonalTableSettingsDto } from '../../../src/entities/table-settings/personal-table-settings/dto/create-personal-table-settings.dto.js';
import { FoundPersonalTableSettingsDto } from '../../../src/entities/table-settings/personal-table-settings/dto/found-personal-table-settings.dto.js';

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

currentTest = 'PUT /settings/personal/:connectionId';

test.serial(`${currentTest} should return created personal table settings`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createPersonalTableSettingsDTO: CreatePersonalTableSettingsDto = {
		columns_view: [testTableColumnName, testTableSecondColumnName, 'id'],
		list_fields: ['id', testTableSecondColumnName, testTableColumnName],
		list_per_page: 32,
		ordering: QueryOrderingEnum.ASC,
		ordering_field: testTableColumnName,
		original_names: false,
	};

	const createPersonalTableSettingsResponse = await request(app.getHttpServer())
		.put(`/settings/personal/${createConnectionRO.id}`)
		.query({ tableName: testTableName })
		.send(createPersonalTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createPersonalTableSettingsRO: FoundPersonalTableSettingsDto = JSON.parse(
		createPersonalTableSettingsResponse.text,
	);
	t.is(createPersonalTableSettingsResponse.status, 200);
	t.deepEqual(createPersonalTableSettingsRO.columns_view, createPersonalTableSettingsDTO.columns_view);
	t.deepEqual(createPersonalTableSettingsRO.list_fields, createPersonalTableSettingsDTO.list_fields);
	t.is(createPersonalTableSettingsRO.list_per_page, createPersonalTableSettingsDTO.list_per_page);
	t.is(createPersonalTableSettingsRO.ordering, createPersonalTableSettingsDTO.ordering);
	t.is(createPersonalTableSettingsRO.ordering_field, createPersonalTableSettingsDTO.ordering_field);
	t.is(createPersonalTableSettingsRO.original_names, createPersonalTableSettingsDTO.original_names);

	// should update found personal table settings
	const updatedPersonalTableSettingsDTO = {
		list_per_page: 52,
		ordering: QueryOrderingEnum.DESC,
		list_fields: [testTableSecondColumnName, testTableColumnName, 'id'],
	};
	const updatePersonalTableSettingsResponse = await request(app.getHttpServer())
		.put(`/settings/personal/${createConnectionRO.id}`)
		.query({ tableName: testTableName })
		.send(updatedPersonalTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const updatePersonalTableSettingsRO: FoundPersonalTableSettingsDto = JSON.parse(
		updatePersonalTableSettingsResponse.text,
	);
	t.is(updatePersonalTableSettingsResponse.status, 200);
	t.deepEqual(updatePersonalTableSettingsRO.columns_view, createPersonalTableSettingsDTO.columns_view);
	t.deepEqual(updatePersonalTableSettingsRO.list_fields, updatedPersonalTableSettingsDTO.list_fields);
	t.is(updatePersonalTableSettingsRO.list_per_page, updatedPersonalTableSettingsDTO.list_per_page);
	t.is(updatePersonalTableSettingsRO.ordering, updatedPersonalTableSettingsDTO.ordering);
	t.is(updatePersonalTableSettingsRO.ordering_field, createPersonalTableSettingsDTO.ordering_field);
	t.is(updatePersonalTableSettingsRO.original_names, createPersonalTableSettingsDTO.original_names);

	// find updated personal table settings
	const findPersonalTableSettingsResponse = await request(app.getHttpServer())
		.get(`/settings/personal/${createConnectionRO.id}`)
		.query({ tableName: testTableName })
		.send()
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const findPersonalTableSettingsRO: FoundPersonalTableSettingsDto = JSON.parse(findPersonalTableSettingsResponse.text);
	t.is(findPersonalTableSettingsResponse.status, 200);
	t.deepEqual(findPersonalTableSettingsRO.columns_view, createPersonalTableSettingsDTO.columns_view);
	t.deepEqual(findPersonalTableSettingsRO.list_fields, updatedPersonalTableSettingsDTO.list_fields);
	t.is(findPersonalTableSettingsRO.list_per_page, updatedPersonalTableSettingsDTO.list_per_page);
	t.is(findPersonalTableSettingsRO.ordering, updatedPersonalTableSettingsDTO.ordering);
	t.is(findPersonalTableSettingsRO.ordering_field, createPersonalTableSettingsDTO.ordering_field);
	t.is(findPersonalTableSettingsRO.original_names, createPersonalTableSettingsDTO.original_names);
});

currentTest = 'GET /settings/personal/:connectionId';

test.serial(`${currentTest} should return found personal table settings`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createPersonalTableSettingsDTO: CreatePersonalTableSettingsDto = {
		columns_view: [testTableColumnName, testTableSecondColumnName, 'id'],
		list_fields: [testTableSecondColumnName, testTableColumnName, 'id'],
		list_per_page: 32,
		ordering: QueryOrderingEnum.ASC,
		ordering_field: testTableColumnName,
		original_names: false,
	};

	const createPersonalTableSettingsResponse = await request(app.getHttpServer())
		.put(`/settings/personal/${createConnectionRO.id}`)
		.query({ tableName: testTableName })
		.send(createPersonalTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createPersonalTableSettingsRO: FoundPersonalTableSettingsDto = JSON.parse(
		createPersonalTableSettingsResponse.text,
	);
	t.is(createPersonalTableSettingsResponse.status, 200);
	t.deepEqual(createPersonalTableSettingsRO.columns_view, createPersonalTableSettingsDTO.columns_view);
	t.deepEqual(createPersonalTableSettingsRO.list_fields, createPersonalTableSettingsDTO.list_fields);
	t.is(createPersonalTableSettingsRO.list_per_page, createPersonalTableSettingsDTO.list_per_page);
	t.is(createPersonalTableSettingsRO.ordering, createPersonalTableSettingsDTO.ordering);
	t.is(createPersonalTableSettingsRO.ordering_field, createPersonalTableSettingsDTO.ordering_field);
	t.is(createPersonalTableSettingsRO.original_names, createPersonalTableSettingsDTO.original_names);

	const findPersonalTableSettingsResponse = await request(app.getHttpServer())
		.get(`/settings/personal/${createConnectionRO.id}`)
		.query({ tableName: testTableName })
		.send(createPersonalTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const findPersonalTableSettingsRO: FoundPersonalTableSettingsDto = JSON.parse(findPersonalTableSettingsResponse.text);
	t.is(findPersonalTableSettingsResponse.status, 200);
	t.deepEqual(findPersonalTableSettingsRO.columns_view, createPersonalTableSettingsDTO.columns_view);
	t.deepEqual(findPersonalTableSettingsRO.list_fields, createPersonalTableSettingsDTO.list_fields);
	t.is(findPersonalTableSettingsRO.list_per_page, createPersonalTableSettingsDTO.list_per_page);
	t.is(findPersonalTableSettingsRO.ordering, createPersonalTableSettingsDTO.ordering);
	t.is(findPersonalTableSettingsRO.ordering_field, createPersonalTableSettingsDTO.ordering_field);
	t.is(findPersonalTableSettingsRO.original_names, createPersonalTableSettingsDTO.original_names);
});

test.serial(`${currentTest} should return empty object when personal table settings wasn't created`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createPersonalTableSettingsDTO: CreatePersonalTableSettingsDto = {
		columns_view: [testTableColumnName, testTableSecondColumnName, 'id'],
		list_fields: [testTableSecondColumnName, testTableColumnName, 'id'],
		list_per_page: 32,
		ordering: QueryOrderingEnum.ASC,
		ordering_field: testTableColumnName,
		original_names: false,
	};

	const findPersonalTableSettingsResponse = await request(app.getHttpServer())
		.get(`/settings/personal/${createConnectionRO.id}`)
		.query({ tableName: testTableName })
		.send(createPersonalTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const findPersonalTableSettingsRO: FoundPersonalTableSettingsDto = JSON.parse(findPersonalTableSettingsResponse.text);
	t.is(findPersonalTableSettingsResponse.status, 200);
	t.deepEqual(findPersonalTableSettingsRO, {});
});

currentTest = 'GET /table/rows/:slug personal settings priority';

test.skip(`${currentTest} should use personal table settings over common table settings when both exist`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	// Create common table settings with specific list_fields
	const createTableSettingsDTO = mockFactory.generateTableSettings(
		createConnectionRO.id,
		testTableName,
		[testTableColumnName],
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
	);
	createTableSettingsDTO.list_fields = ['id', testTableColumnName, testTableSecondColumnName];
	createTableSettingsDTO.list_per_page = 10;
	createTableSettingsDTO.ordering = QueryOrderingEnum.ASC;
	createTableSettingsDTO.ordering_field = 'id';

	const createTableSettingsResponse = await request(app.getHttpServer())
		.post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
		.send(createTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createTableSettingsResponse.status, 201);

	// Create personal table settings with different values
	const createPersonalTableSettingsDTO: CreatePersonalTableSettingsDto = {
		list_fields: ['id', testTableColumnName], // different list_fields (fewer columns)
		list_per_page: 5, // different list_per_page
		ordering: QueryOrderingEnum.DESC, // different ordering
		ordering_field: testTableColumnName, // different ordering_field
		original_names: true,
		columns_view: [testTableColumnName, 'id'],
	};

	const createPersonalTableSettingsResponse = await request(app.getHttpServer())
		.put(`/settings/personal/${createConnectionRO.id}`)
		.query({ tableName: testTableName })
		.send(createPersonalTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createPersonalTableSettingsResponse.status, 200);

	// Get table rows and verify personal settings are applied
	const getTableRowsResponse = await request(app.getHttpServer())
		.get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getTableRowsResponse.status, 200);
	const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

	// Verify that personal settings list_per_page is used (5 instead of 10)
	t.is(getTableRowsRO.pagination.perPage, 5);

	// Verify that personal list_fields are used - rows should only have id and testTableColumnName
	const rowKeys = Object.keys(getTableRowsRO.rows[0]);
	t.true(rowKeys.includes('id'));
	t.true(rowKeys.includes(testTableColumnName));
	// t.false(rowKeys.includes(testTableSecondColumnName)); // was in common settings but not in personal
});

test.serial(`${currentTest} should use common table settings when personal table settings do not exist`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	// Create only common table settings with specific list_fields
	const createTableSettingsDTO = mockFactory.generateTableSettings(
		createConnectionRO.id,
		testTableName,
		[testTableColumnName],
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
	);
	createTableSettingsDTO.list_fields = ['id', testTableColumnName, testTableSecondColumnName];
	createTableSettingsDTO.list_per_page = 7;
	createTableSettingsDTO.ordering = QueryOrderingEnum.ASC;
	createTableSettingsDTO.ordering_field = 'id';

	const createTableSettingsResponse = await request(app.getHttpServer())
		.post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
		.send(createTableSettingsDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createTableSettingsResponse.status, 201);

	// No personal table settings created

	// Get table rows and verify common settings are applied
	const getTableRowsResponse = await request(app.getHttpServer())
		.get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getTableRowsResponse.status, 200);
	const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

	// Verify that common settings list_per_page is used (7)
	t.is(getTableRowsRO.pagination.perPage, 7);

	// Verify that common list_fields are used - rows should have id, testTableColumnName, and testTableSecondColumnName
	const rowKeys = Object.keys(getTableRowsRO.rows[0]);
	t.true(rowKeys.includes('id'));
	t.true(rowKeys.includes(testTableColumnName));
	t.true(rowKeys.includes(testTableSecondColumnName));
});

test.serial(
	`${currentTest} should use common table settings list_fields when personal list_fields is empty array`,
	async (t) => {
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
		const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionToTestDB)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		const createConnectionRO = JSON.parse(createConnectionResponse.text);
		t.is(createConnectionResponse.status, 201);

		// Create common table settings with specific list_fields
		const createTableSettingsDTO = mockFactory.generateTableSettings(
			createConnectionRO.id,
			testTableName,
			[testTableColumnName],
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		createTableSettingsDTO.list_fields = ['id', testTableColumnName];
		createTableSettingsDTO.list_per_page = 8;

		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${createConnectionRO.id}&tableName=${testTableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 201);

		// Create personal table settings with empty list_fields but different list_per_page
		const createPersonalTableSettingsDTO: CreatePersonalTableSettingsDto = {
			list_fields: [], // empty list_fields - should fall back to common
			list_per_page: 4, // different list_per_page
			ordering: QueryOrderingEnum.DESC,
			ordering_field: testTableColumnName,
			original_names: true,
			columns_view: [testTableColumnName, 'id'],
		};

		const createPersonalTableSettingsResponse = await request(app.getHttpServer())
			.put(`/settings/personal/${createConnectionRO.id}`)
			.query({ tableName: testTableName })
			.send(createPersonalTableSettingsDTO)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createPersonalTableSettingsResponse.status, 200);

		// Get table rows and verify settings are applied correctly
		const getTableRowsResponse = await request(app.getHttpServer())
			.get(`/table/rows/${createConnectionRO.id}?tableName=${testTableName}`)
			.set('Cookie', firstUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getTableRowsResponse.status, 200);
		const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

		// Verify that personal settings list_per_page is used (4)
		t.is(getTableRowsRO.pagination.perPage, 4);

		// Verify that common list_fields are used since personal was empty
		const rowKeys = Object.keys(getTableRowsRO.rows[0]);
		t.true(rowKeys.includes('id'));
		t.true(rowKeys.includes(testTableColumnName));
	},
);
