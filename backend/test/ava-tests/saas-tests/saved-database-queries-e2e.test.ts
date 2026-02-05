/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
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
import { CreateSavedDbQueryDto } from '../../../src/entities/visualizations/saved-db-query/dto/create-saved-db-query.dto.js';
import { FoundSavedDbQueryDto } from '../../../src/entities/visualizations/saved-db-query/dto/found-saved-db-query.dto.js';
import { UpdateSavedDbQueryDto } from '../../../src/entities/visualizations/saved-db-query/dto/update-saved-db-query.dto.js';
import { ExecuteSavedDbQueryResultDto } from '../../../src/entities/visualizations/saved-db-query/dto/execute-saved-db-query-result.dto.js';
import { TestDbQueryDto } from '../../../src/entities/visualizations/saved-db-query/dto/test-db-query.dto.js';
import { TestDbQueryResultDto } from '../../../src/entities/visualizations/saved-db-query/dto/test-db-query-result.dto.js';
import { DashboardWidgetTypeEnum } from '../../../src/enums/dashboard-widget-type.enum.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

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

currentTest = 'POST /connection/:connectionId/saved-query';

test.serial(`${currentTest} should create a new saved query`, async (t) => {
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

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Test Query',
		description: 'A test query for e2e testing',
		query_text: `SELECT * FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(createSavedQueryResponse.text);
	t.is(createSavedQueryResponse.status, 201);
	t.truthy(createSavedQueryRO.id);
	t.is(createSavedQueryRO.name, createSavedQueryDTO.name);
	t.is(createSavedQueryRO.description, createSavedQueryDTO.description);
	t.is(createSavedQueryRO.query_text, createSavedQueryDTO.query_text);
	t.is(createSavedQueryRO.connection_id, createConnectionRO.id);
	t.truthy(createSavedQueryRO.created_at);
	t.truthy(createSavedQueryRO.updated_at);
});

test.serial(`${currentTest} should fail to create a saved query without name`, async (t) => {
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

	const createSavedQueryDTO = {
		description: 'A test query without name',
		query_text: `SELECT * FROM ${testTableName}`,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createSavedQueryResponse.status, 400);
});

test.serial(`${currentTest} should fail to create a saved query without query_text`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createSavedQueryDTO = {
		name: 'Test Query',
		description: 'A test query without query_text',
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createSavedQueryResponse.status, 400);
});

currentTest = 'GET /connection/:connectionId/saved-queries';

test.serial(`${currentTest} should return all saved queries for a connection`, async (t) => {
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

	// Create first saved query
	const createSavedQueryDTO1: CreateSavedDbQueryDto = {
		name: 'Test Query 1',
		description: 'First test query',
		query_text: `SELECT * FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO1)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	// Create second saved query
	const createSavedQueryDTO2: CreateSavedDbQueryDto = {
		name: 'Test Query 2',
		description: 'Second test query',
		query_text: `SELECT id FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO2)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	// Get all saved queries
	const getAllSavedQueriesResponse = await request(app.getHttpServer())
		.get(`/connection/${createConnectionRO.id}/saved-queries`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const getAllSavedQueriesRO: FoundSavedDbQueryDto[] = JSON.parse(getAllSavedQueriesResponse.text);
	t.is(getAllSavedQueriesResponse.status, 200);
	t.true(Array.isArray(getAllSavedQueriesRO));
	t.is(getAllSavedQueriesRO.length, 2);
	t.truthy(getAllSavedQueriesRO.find((q) => q.name === 'Test Query 1'));
	t.truthy(getAllSavedQueriesRO.find((q) => q.name === 'Test Query 2'));
});

test.serial(`${currentTest} should return empty array when no saved queries exist`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const getAllSavedQueriesResponse = await request(app.getHttpServer())
		.get(`/connection/${createConnectionRO.id}/saved-queries`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const getAllSavedQueriesRO: FoundSavedDbQueryDto[] = JSON.parse(getAllSavedQueriesResponse.text);
	t.is(getAllSavedQueriesResponse.status, 200);
	t.true(Array.isArray(getAllSavedQueriesRO));
	t.is(getAllSavedQueriesRO.length, 0);
});

currentTest = 'GET /connection/:connectionId/saved-query/:queryId';

test.serial(`${currentTest} should return a saved query by id`, async (t) => {
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

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Test Query',
		description: 'A test query for e2e testing',
		query_text: `SELECT * FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(createSavedQueryResponse.text);
	t.is(createSavedQueryResponse.status, 201);

	// Get saved query by id
	const getSavedQueryResponse = await request(app.getHttpServer())
		.get(`/connection/${createConnectionRO.id}/saved-query/${createSavedQueryRO.id}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const getSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(getSavedQueryResponse.text);
	t.is(getSavedQueryResponse.status, 200);
	t.is(getSavedQueryRO.id, createSavedQueryRO.id);
	t.is(getSavedQueryRO.name, createSavedQueryDTO.name);
	t.is(getSavedQueryRO.description, createSavedQueryDTO.description);
	t.is(getSavedQueryRO.query_text, createSavedQueryDTO.query_text);
});

test.serial(`${currentTest} should return 404 when saved query not found`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const nonExistentQueryId = '00000000-0000-0000-0000-000000000000';
	const getSavedQueryResponse = await request(app.getHttpServer())
		.get(`/connection/${createConnectionRO.id}/saved-query/${nonExistentQueryId}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getSavedQueryResponse.status, 404);
});

currentTest = 'PUT /connection/:connectionId/saved-query/:queryId';

test.serial(`${currentTest} should update a saved query`, async (t) => {
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

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Original Query Name',
		description: 'Original description',
		query_text: `SELECT * FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(createSavedQueryResponse.text);
	t.is(createSavedQueryResponse.status, 201);

	// Update saved query
	const updateSavedQueryDTO: UpdateSavedDbQueryDto = {
		name: 'Updated Query Name',
		description: 'Updated description',
		query_text: `SELECT id FROM ${testTableName}`,
	};

	const updateSavedQueryResponse = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}/saved-query/${createSavedQueryRO.id}`)
		.send(updateSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const updateSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(updateSavedQueryResponse.text);
	t.is(updateSavedQueryResponse.status, 200);
	t.is(updateSavedQueryRO.id, createSavedQueryRO.id);
	t.is(updateSavedQueryRO.name, updateSavedQueryDTO.name);
	t.is(updateSavedQueryRO.description, updateSavedQueryDTO.description);
	t.is(updateSavedQueryRO.query_text, updateSavedQueryDTO.query_text);
});

test.serial(`${currentTest} should update only provided fields`, async (t) => {
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

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Original Query Name',
		description: 'Original description',
		query_text: `SELECT * FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(createSavedQueryResponse.text);
	t.is(createSavedQueryResponse.status, 201);

	const updateSavedQueryDTO: UpdateSavedDbQueryDto = {
		name: 'Updated Query Name Only',
	};

	const updateSavedQueryResponse = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}/saved-query/${createSavedQueryRO.id}`)
		.send(updateSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const updateSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(updateSavedQueryResponse.text);
	t.is(updateSavedQueryResponse.status, 200);
	t.is(updateSavedQueryRO.name, updateSavedQueryDTO.name);
	t.is(updateSavedQueryRO.description, createSavedQueryDTO.description);
	t.is(updateSavedQueryRO.query_text, createSavedQueryDTO.query_text);
});

test.serial(`${currentTest} should return 404 when updating non-existent query`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const nonExistentQueryId = '00000000-0000-0000-0000-000000000000';
	const updateSavedQueryDTO: UpdateSavedDbQueryDto = {
		name: 'Updated Query Name',
	};

	const updateSavedQueryResponse = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}/saved-query/${nonExistentQueryId}`)
		.send(updateSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(updateSavedQueryResponse.status, 404);
});

currentTest = 'DELETE /connection/:connectionId/saved-query/:queryId';

test.serial(`${currentTest} should delete a saved query`, async (t) => {
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

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Query to Delete',
		description: 'This query will be deleted',
		query_text: `SELECT * FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(createSavedQueryResponse.text);
	t.is(createSavedQueryResponse.status, 201);

	// Delete saved query
	const deleteSavedQueryResponse = await request(app.getHttpServer())
		.delete(`/connection/${createConnectionRO.id}/saved-query/${createSavedQueryRO.id}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const deleteSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(deleteSavedQueryResponse.text);
	t.is(deleteSavedQueryResponse.status, 200);
	t.is(deleteSavedQueryRO.id, createSavedQueryRO.id);

	// Verify query is deleted
	const getSavedQueryResponse = await request(app.getHttpServer())
		.get(`/connection/${createConnectionRO.id}/saved-query/${createSavedQueryRO.id}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(getSavedQueryResponse.status, 404);
});

test.serial(`${currentTest} should return 404 when deleting non-existent query`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const nonExistentQueryId = '00000000-0000-0000-0000-000000000000';
	const deleteSavedQueryResponse = await request(app.getHttpServer())
		.delete(`/connection/${createConnectionRO.id}/saved-query/${nonExistentQueryId}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(deleteSavedQueryResponse.status, 404);
});

currentTest = 'POST /connection/:connectionId/saved-query/:queryId/execute';

test.serial(`${currentTest} should execute a saved query and return results`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);
	console.log('🚀 ~ testTableName:', testTableName);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Query to Execute',
		description: 'This query will be executed',
		query_text: `SELECT * FROM "${testTableName}"`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(createSavedQueryResponse.text);
	t.is(createSavedQueryResponse.status, 201);

	// Execute saved query
	const executeSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query/${createSavedQueryRO.id}/execute`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const executeSavedQueryRO: ExecuteSavedDbQueryResultDto = JSON.parse(executeSavedQueryResponse.text);
	t.is(executeSavedQueryResponse.status, 201);
	t.is(executeSavedQueryRO.query_id, createSavedQueryRO.id);
	t.is(executeSavedQueryRO.query_name, createSavedQueryDTO.name);
	t.true(Array.isArray(executeSavedQueryRO.data));
	t.truthy(executeSavedQueryRO.execution_time_ms >= 0);
});

test.serial(`${currentTest} should return 404 when executing non-existent query`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const nonExistentQueryId = '00000000-0000-0000-0000-000000000000';
	const executeSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query/${nonExistentQueryId}/execute`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(executeSavedQueryResponse.status, 404);
});

currentTest = 'Saved queries isolation between connections';

test.serial(`${currentTest} should not return queries from other connections`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName } = await createTestTable(connectionToTestDB);

	// Create first connection
	const createConnection1Response = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnection1RO = JSON.parse(createConnection1Response.text);
	t.is(createConnection1Response.status, 201);

	// Create second connection
	const createConnection2Response = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnection2RO = JSON.parse(createConnection2Response.text);
	t.is(createConnection2Response.status, 201);

	// Create saved query in first connection
	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Query in Connection 1',
		description: 'This query belongs to connection 1',
		query_text: `SELECT * FROM ${testTableName}`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	await request(app.getHttpServer())
		.post(`/connection/${createConnection1RO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	// Get queries from second connection - should be empty
	const getQueriesFromConnection2Response = await request(app.getHttpServer())
		.get(`/connection/${createConnection2RO.id}/saved-queries`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const getQueriesFromConnection2RO: FoundSavedDbQueryDto[] = JSON.parse(getQueriesFromConnection2Response.text);
	t.is(getQueriesFromConnection2Response.status, 200);
	t.is(getQueriesFromConnection2RO.length, 0);

	// Get queries from first connection - should have the query
	const getQueriesFromConnection1Response = await request(app.getHttpServer())
		.get(`/connection/${createConnection1RO.id}/saved-queries`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const getQueriesFromConnection1RO: FoundSavedDbQueryDto[] = JSON.parse(getQueriesFromConnection1Response.text);
	t.is(getQueriesFromConnection1Response.status, 200);
	t.is(getQueriesFromConnection1RO.length, 1);
	t.is(getQueriesFromConnection1RO[0].name, 'Query in Connection 1');
});

currentTest = 'POST /connection/:connectionId/query/test';

test.serial(`${currentTest} should test a query and return results`, async (t) => {
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

	const testQueryDTO: TestDbQueryDto = {
		query_text: `SELECT * FROM "${testTableName}"`,
	};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const testQueryRO: TestDbQueryResultDto = JSON.parse(testQueryResponse.text);
	t.is(testQueryResponse.status, 201);
	t.true(Array.isArray(testQueryRO.data));
	t.truthy(testQueryRO.execution_time_ms >= 0);
});

test.serial(`${currentTest} should fail to test a query without query_text`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const testQueryDTO = {};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(testQueryResponse.status, 400);
});

test.serial(`${currentTest} should return error for invalid SQL query`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const testQueryDTO: TestDbQueryDto = {
		query_text: 'SELECT * FROM non_existent_table_12345',
	};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(testQueryResponse.status, 500);
});

test.serial(`${currentTest} should test a query with specific columns`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName, testTableColumnName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const createConnectionRO = JSON.parse(createConnectionResponse.text);
	t.is(createConnectionResponse.status, 201);

	const testQueryDTO: TestDbQueryDto = {
		query_text: `SELECT id, "${testTableColumnName}" FROM "${testTableName}" LIMIT 5`,
	};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const testQueryRO: TestDbQueryResultDto = JSON.parse(testQueryResponse.text);
	t.is(testQueryResponse.status, 201);
	t.true(Array.isArray(testQueryRO.data));
	t.true(testQueryRO.data.length <= 5);
	t.truthy(testQueryRO.execution_time_ms >= 0);
});

currentTest = 'Query safety validation';

test.serial(`${currentTest} should reject INSERT query in test endpoint`, async (t) => {
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

	const testQueryDTO: TestDbQueryDto = {
		query_text: `INSERT INTO "${testTableName}" (id) VALUES (999)`,
	};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(testQueryResponse.status, 400);
	t.true(testQueryResponse.text.includes('Unsafe query'));
});

test.serial(`${currentTest} should reject DELETE query in test endpoint`, async (t) => {
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

	const testQueryDTO: TestDbQueryDto = {
		query_text: `DELETE FROM "${testTableName}" WHERE id = 1`,
	};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(testQueryResponse.status, 400);
	t.true(testQueryResponse.text.includes('Unsafe query'));
});

test.serial(`${currentTest} should reject UPDATE query in test endpoint`, async (t) => {
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

	const testQueryDTO: TestDbQueryDto = {
		query_text: `UPDATE "${testTableName}" SET id = 999 WHERE id = 1`,
	};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(testQueryResponse.status, 400);
	t.true(testQueryResponse.text.includes('Unsafe query'));
});

test.serial(`${currentTest} should reject DROP TABLE query in test endpoint`, async (t) => {
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

	const testQueryDTO: TestDbQueryDto = {
		query_text: `DROP TABLE "${testTableName}"`,
	};

	const testQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/query/test`)
		.send(testQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(testQueryResponse.status, 400);
	t.true(testQueryResponse.text.includes('Unsafe query'));
});

test.serial(`${currentTest} should reject unsafe query when creating saved query`, async (t) => {
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

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Unsafe Query',
		description: 'This should be rejected',
		query_text: `DELETE FROM "${testTableName}"`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createSavedQueryResponse.status, 400);
	t.true(createSavedQueryResponse.text.includes('Unsafe query'));
});

test.serial(`${currentTest} should reject unsafe query when updating saved query`, async (t) => {
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

	const createSavedQueryDTO: CreateSavedDbQueryDto = {
		name: 'Safe Query',
		description: 'This is safe',
		query_text: `SELECT * FROM "${testTableName}"`,
		widget_type: DashboardWidgetTypeEnum.Table,
	};

	const createSavedQueryResponse = await request(app.getHttpServer())
		.post(`/connection/${createConnectionRO.id}/saved-query`)
		.send(createSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createSavedQueryRO: FoundSavedDbQueryDto = JSON.parse(createSavedQueryResponse.text);
	t.is(createSavedQueryResponse.status, 201);

	const updateSavedQueryDTO: UpdateSavedDbQueryDto = {
		query_text: `DROP TABLE "${testTableName}"`,
	};

	const updateSavedQueryResponse = await request(app.getHttpServer())
		.put(`/connection/${createConnectionRO.id}/saved-query/${createSavedQueryRO.id}`)
		.send(updateSavedQueryDTO)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(updateSavedQueryResponse.status, 400);
	t.true(updateSavedQueryResponse.text.includes('Unsafe query'));
});
