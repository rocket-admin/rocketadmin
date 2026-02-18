/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AICoreService } from '../../../src/ai-core/index.js';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { DashboardWidgetTypeEnum } from '../../../src/enums/dashboard-widget-type.enum.js';
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

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

const MOCK_AI_RESPONSE_CHART = JSON.stringify({
	name: 'Sales by Category',
	description: 'Bar chart showing total sales grouped by category',
	query_text: 'SELECT category, SUM(amount) as total FROM orders GROUP BY category',
	widget_type: 'chart',
	chart_type: 'bar',
	widget_options: {
		label_column: 'category',
		value_column: 'total',
		show_data_labels: true,
		legend: {
			show: true,
			position: 'top',
		},
	},
});

const MOCK_AI_RESPONSE_COUNTER = JSON.stringify({
	name: 'Total Orders',
	description: 'Counter showing total number of orders',
	query_text: 'SELECT COUNT(*) as total FROM orders',
	widget_type: 'counter',
	widget_options: {
		value_column: 'total',
	},
});

const MOCK_AI_RESPONSE_UNSAFE_QUERY = JSON.stringify({
	name: 'Delete All',
	description: 'Unsafe query',
	query_text: 'DELETE FROM orders',
	widget_type: 'table',
});

let mockResponse = MOCK_AI_RESPONSE_CHART;

const mockAICoreService = {
	completeWithProvider: async () => mockResponse,
	complete: async () => mockResponse,
	chat: async () => ({ content: mockResponse, responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: mockResponse, responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: mockResponse, responseId: faker.string.uuid() }),
	streamChatWithTools: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: mockResponse, responseId: faker.string.uuid() };
		},
	}),
	streamChatWithToolsAndProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: mockResponse, responseId: faker.string.uuid() };
		},
	}),
	getDefaultProvider: () => 'bedrock',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

test.before(async () => {
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	})
		.overrideProvider(AICoreService)
		.useValue(mockAICoreService)
		.compile();

	testUtils = moduleFixture.get<TestUtils>(TestUtils);

	app = moduleFixture.createNestApplication();
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

currentTest = 'POST /dashboard/:dashboardId/widget/generate/:connectionId';

test.serial(`${currentTest} should generate a widget with AI for chart type`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_CHART;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;
	t.is(createConnectionResponse.status, 201);

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'AI Generated Dashboard' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;
	t.is(createDashboard.status, 201);

	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/generate/${connectionId}?tableName=${testTableName}`)
		.send({
			chart_description: 'Show total sales by category as a bar chart',
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const generateWidgetRO = JSON.parse(generateWidget.text);
	t.is(generateWidget.status, 201);
	t.truthy(generateWidgetRO.id);
	t.truthy(generateWidgetRO.query_id);
	t.is(generateWidgetRO.dashboard_id, dashboardId);
	t.is(generateWidgetRO.width, 6);
	t.is(generateWidgetRO.height, 4);

	const getSavedQueries = await request(app.getHttpServer())
		.get(`/connection/${connectionId}/saved-queries`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const queries = JSON.parse(getSavedQueries.text);
	t.is(getSavedQueries.status, 200);
	t.true(queries.length >= 1);

	const createdQuery = queries.find((q: { id: string }) => q.id === generateWidgetRO.query_id);
	t.truthy(createdQuery);
	t.is(createdQuery.name, 'Sales by Category');
	t.is(createdQuery.widget_type, DashboardWidgetTypeEnum.Chart);
	t.is(createdQuery.chart_type, 'bar');
});

test.serial(`${currentTest} should generate a counter widget with AI`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_COUNTER;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;
	t.is(createConnectionResponse.status, 201);

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Counter Dashboard' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/generate/${connectionId}?tableName=${testTableName}`)
		.send({
			chart_description: 'Show total count of orders',
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const generateWidgetRO = JSON.parse(generateWidget.text);
	t.is(generateWidget.status, 201);
	t.truthy(generateWidgetRO.id);
	t.truthy(generateWidgetRO.query_id);

	const getQuery = await request(app.getHttpServer())
		.get(`/connection/${connectionId}/saved-query/${generateWidgetRO.query_id}`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const query = JSON.parse(getQuery.text);
	t.is(getQuery.status, 200);
	t.is(query.name, 'Total Orders');
	t.is(query.widget_type, DashboardWidgetTypeEnum.Counter);
});

test.serial(`${currentTest} should reject AI-generated unsafe query`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_UNSAFE_QUERY;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Unsafe Query Dashboard' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/generate/${connectionId}?tableName=${testTableName}`)
		.send({
			chart_description: 'Delete all data',
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateWidget.status, 400);
	const errorResponse = JSON.parse(generateWidget.text);
	t.truthy(errorResponse.message);
	t.true(errorResponse.message.includes('Unsafe query') || errorResponse.message.includes('DELETE'));
});

test.serial(`${currentTest} should generate widget with custom name`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_CHART;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Custom Name Dashboard' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const customName = 'My Custom Widget Name';
	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/generate/${connectionId}?tableName=${testTableName}`)
		.send({
			chart_description: 'Show sales data',
			name: customName,
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const generateWidgetRO = JSON.parse(generateWidget.text);
	t.is(generateWidget.status, 201);

	const getQuery = await request(app.getHttpServer())
		.get(`/connection/${connectionId}/saved-query/${generateWidgetRO.query_id}`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const query = JSON.parse(getQuery.text);
	t.is(query.name, customName);
});

test.serial(`${currentTest} should fail without tableName query parameter`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_CHART;

	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'No Table Dashboard' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/generate/${connectionId}`)
		.send({
			chart_description: 'Show some data',
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateWidget.status, 400);
});

test.serial(`${currentTest} should fail without chart_description`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_CHART;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'No Description Dashboard' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/generate/${connectionId}?tableName=${testTableName}`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateWidget.status, 400);
});

test.serial(`${currentTest} should fail for non-existent dashboard`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_CHART;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);
	const { testTableName } = await createTestTable(connectionToTestDB);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;

	const fakeDashboardId = faker.string.uuid();

	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${fakeDashboardId}/widget/generate/${connectionId}?tableName=${testTableName}`)
		.send({
			chart_description: 'Show some data',
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateWidget.status, 404);
});

test.serial(`${currentTest} should fail for non-existent table`, async (t) => {
	mockResponse = MOCK_AI_RESPONSE_CHART;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Non-existent Table Dashboard' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const generateWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/generate/${connectionId}?tableName=non_existent_table_xyz`)
		.send({
			chart_description: 'Show some data',
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateWidget.status, 400);
});
