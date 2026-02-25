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
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let testUtils: TestUtils;
let currentTest: string;

const MOCK_DASHBOARD_SUGGESTION = JSON.stringify({
	dashboard_name: 'Test Analytics Dashboard',
	dashboard_description: 'Automated dashboard for test table analysis',
	charts: [
		{
			chart_description: 'Show total count of records',
			suggested_panel_type: 'counter',
		},
		{
			chart_description: 'Show distribution of records by name',
			suggested_panel_type: 'chart',
			suggested_chart_type: 'bar',
		},
	],
});

const MOCK_PANEL_RESPONSE = JSON.stringify({
	name: 'Record Count',
	description: 'Total number of records',
	query_text: 'SELECT COUNT(*) as total FROM test_table',
	panel_type: 'counter',
	panel_options: {
		value_column: 'total',
	},
});

const MOCK_PANEL_RESPONSE_UNSAFE = JSON.stringify({
	name: 'Drop Table',
	description: 'Unsafe query',
	query_text: 'DROP TABLE test_table',
	panel_type: 'table',
});

let mockDashboardSuggestion = MOCK_DASHBOARD_SUGGESTION;
let mockPanelResponse = MOCK_PANEL_RESPONSE;

const mockAICoreService = {
	completeWithProvider: async (_provider: string, prompt: string) => {
		if (prompt.includes('chart/panel visualizations')) {
			return mockDashboardSuggestion;
		}
		if (prompt.includes('query optimization assistant')) {
			const match = prompt.match(/CURRENT QUERY:\n([\s\S]*?)\n\n/);
			return match ? match[1].trim() : 'SELECT 1';
		}
		return mockPanelResponse;
	},
	complete: async () => mockPanelResponse,
	chat: async () => ({ content: mockPanelResponse, responseId: faker.string.uuid() }),
	streamChat: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: mockPanelResponse, responseId: faker.string.uuid() };
		},
	}),
	chatWithTools: async () => ({ content: mockPanelResponse, responseId: faker.string.uuid() }),
	streamChatWithTools: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: mockPanelResponse, responseId: faker.string.uuid() };
		},
	}),
	streamChatWithToolsAndProvider: async () => ({
		*[Symbol.asyncIterator]() {
			yield { type: 'text', content: mockPanelResponse, responseId: faker.string.uuid() };
		},
	}),
	getDefaultProvider: () => 'bedrock',
	setDefaultProvider: () => {},
	getAvailableProviders: () => [],
};

test.before(async () => {
	setSaasEnvVariable();
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
	await createInitialTestUser(app);
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

currentTest = 'POST /dashboard/generate-table-dashboard/:connectionId';

test.serial(`${currentTest} should generate and persist a table dashboard with AI`, async (t) => {
	mockDashboardSuggestion = MOCK_DASHBOARD_SUGGESTION;
	mockPanelResponse = MOCK_PANEL_RESPONSE;

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

	const generateDashboard = await request(app.getHttpServer())
		.post(`/dashboard/generate-table-dashboard/${connectionId}?tableName=${testTableName}`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const generateDashboardRO = JSON.parse(generateDashboard.text);
	t.is(generateDashboard.status, 201);
	t.deepEqual(generateDashboardRO, { success: true });

	// Verify dashboard was persisted
	const getDashboards = await request(app.getHttpServer())
		.get(`/dashboards/${connectionId}`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboards = JSON.parse(getDashboards.text);
	t.is(getDashboards.status, 200);
	t.true(Array.isArray(dashboards));

	const generatedDashboard = dashboards.find((d: any) => d.name === 'Test Analytics Dashboard');
	t.truthy(generatedDashboard);
	t.is(generatedDashboard.description, 'Automated dashboard for test table analysis');
	t.is(generatedDashboard.connection_id, connectionId);

	// Verify panel positions (widgets) were persisted in the dashboard
	t.truthy(generatedDashboard.widgets);
	t.is(generatedDashboard.widgets.length, 2);

	for (const widget of generatedDashboard.widgets) {
		t.truthy(widget.id);
		t.truthy(widget.query_id);
		t.is(widget.dashboard_id, generatedDashboard.id);
		t.is(widget.width, 6);
		t.is(widget.height, 4);
	}

	// Verify panels (saved queries) were persisted
	const getSavedQueries = await request(app.getHttpServer())
		.get(`/connection/${connectionId}/saved-queries`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const queries = JSON.parse(getSavedQueries.text);
	t.is(getSavedQueries.status, 200);
	t.true(queries.length >= 2);

	const generatedPanels = queries.filter((q: any) => q.name === 'Record Count');
	t.is(generatedPanels.length, 2);
	for (const panel of generatedPanels) {
		t.truthy(panel.id);
		t.is(panel.connection_id, connectionId);
		t.truthy(panel.query_text);
	}
});

test.serial(`${currentTest} should use custom dashboard name when provided`, async (t) => {
	mockDashboardSuggestion = MOCK_DASHBOARD_SUGGESTION;
	mockPanelResponse = MOCK_PANEL_RESPONSE;

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

	const customDashboardName = 'My Custom AI Dashboard';

	const generateDashboard = await request(app.getHttpServer())
		.post(`/dashboard/generate-table-dashboard/${connectionId}?tableName=${testTableName}`)
		.send({ dashboard_name: customDashboardName })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateDashboard.status, 201);
	t.deepEqual(JSON.parse(generateDashboard.text), { success: true });

	// Verify dashboard was created with the custom name
	const getDashboards = await request(app.getHttpServer())
		.get(`/dashboards/${connectionId}`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboards = JSON.parse(getDashboards.text);
	const customDashboard = dashboards.find((d: any) => d.name === customDashboardName);
	t.truthy(customDashboard);
});

test.serial(`${currentTest} should reject when all AI panels have unsafe queries`, async (t) => {
	mockDashboardSuggestion = MOCK_DASHBOARD_SUGGESTION;
	mockPanelResponse = MOCK_PANEL_RESPONSE_UNSAFE;

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

	const generateDashboard = await request(app.getHttpServer())
		.post(`/dashboard/generate-table-dashboard/${connectionId}?tableName=${testTableName}`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateDashboard.status, 400);
	const errorResponse = JSON.parse(generateDashboard.text);
	t.truthy(errorResponse.message);
});

test.serial(`${currentTest} should fail for non-existent table`, async (t) => {
	mockDashboardSuggestion = MOCK_DASHBOARD_SUGGESTION;
	mockPanelResponse = MOCK_PANEL_RESPONSE;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;
	t.is(createConnectionResponse.status, 201);

	const generateDashboard = await request(app.getHttpServer())
		.post(`/dashboard/generate-table-dashboard/${connectionId}?tableName=non_existent_table_xyz`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateDashboard.status, 400);
});

test.serial(`${currentTest} should fail without tableName query parameter`, async (t) => {
	mockDashboardSuggestion = MOCK_DASHBOARD_SUGGESTION;
	mockPanelResponse = MOCK_PANEL_RESPONSE;

	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const { token } = await registerUserAndReturnUserInfo(app);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const connectionId = JSON.parse(createConnectionResponse.text).id;
	t.is(createConnectionResponse.status, 201);

	const generateDashboard = await request(app.getHttpServer())
		.post(`/dashboard/generate-table-dashboard/${connectionId}`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(generateDashboard.status, 400);
});
