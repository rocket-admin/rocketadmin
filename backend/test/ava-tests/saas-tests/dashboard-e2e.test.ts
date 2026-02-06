/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { DashboardWidgetTypeEnum } from '../../../src/enums/dashboard-widget-type.enum.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

const _uuidRegex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test.before(async () => {
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	app = moduleFixture.createNestApplication();
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

// ==================== Dashboard CRUD Tests ====================

currentTest = 'GET /dashboards/:connectionId';

test.serial(`${currentTest} should return empty array when no dashboards created`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const getDashboards = await request(app.getHttpServer())
		.get(`/dashboards/${connectionId}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Accept', 'application/json');

	const getDashboardsRO = JSON.parse(getDashboards.text);
	t.is(getDashboards.status, 200);
	t.is(Array.isArray(getDashboardsRO), true);
	t.is(getDashboardsRO.length, 0);
});

currentTest = 'POST /dashboards/:connectionId';

test.serial(`${currentTest} should create a new dashboard`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const newDashboard = {
		name: 'Test Dashboard',
		description: 'Test dashboard description',
	};

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send(newDashboard)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createDashboardRO = JSON.parse(createDashboard.text);
	t.is(createDashboard.status, 201);
	t.is(createDashboardRO.name, newDashboard.name);
	t.is(createDashboardRO.description, newDashboard.description);
	t.is(createDashboardRO.connection_id, connectionId);
	t.truthy(createDashboardRO.id);
	t.truthy(createDashboardRO.created_at);
	t.truthy(createDashboardRO.updated_at);
});

test.serial(`${currentTest} should fail to create dashboard without name`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createDashboard.status, 400);
});

currentTest = 'GET /dashboard/:dashboardId';

test.serial(`${currentTest} should return dashboard with widgets`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const newDashboard = {
		name: 'Test Dashboard',
		description: 'Test dashboard description',
	};

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send(newDashboard)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const getDashboard = await request(app.getHttpServer())
		.get(`/dashboard/${dashboardId}/${connectionId}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Accept', 'application/json');

	const getDashboardRO = JSON.parse(getDashboard.text);
	t.is(getDashboard.status, 200);
	t.is(getDashboardRO.id, dashboardId);
	t.is(getDashboardRO.name, newDashboard.name);
	t.is(getDashboardRO.description, newDashboard.description);
	t.is(Array.isArray(getDashboardRO.widgets), true);
});

test.serial(`${currentTest} should return 404 for non-existent dashboard`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;
	const fakeDashboardId = faker.string.uuid();

	const getDashboard = await request(app.getHttpServer())
		.get(`/dashboard/${fakeDashboardId}/${connectionId}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Accept', 'application/json');

	t.is(getDashboard.status, 404);
});

currentTest = 'PUT /dashboard/:dashboardId';

test.serial(`${currentTest} should update dashboard`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Original Name' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const updateData = {
		name: 'Updated Name',
		description: 'Updated description',
	};

	const updateDashboard = await request(app.getHttpServer())
		.put(`/dashboard/${dashboardId}/${connectionId}`)
		.send(updateData)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const updateDashboardRO = JSON.parse(updateDashboard.text);
	t.is(updateDashboard.status, 200);
	t.is(updateDashboardRO.name, updateData.name);
	t.is(updateDashboardRO.description, updateData.description);
});

currentTest = 'DELETE /dashboard/:dashboardId';

test.serial(`${currentTest} should delete dashboard`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Dashboard to Delete' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const deleteDashboard = await request(app.getHttpServer())
		.delete(`/dashboard/${dashboardId}/${connectionId}`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(deleteDashboard.status, 200);

	// Verify dashboard is deleted
	const getDashboard = await request(app.getHttpServer())
		.get(`/dashboard/${dashboardId}/${connectionId}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Accept', 'application/json');

	t.is(getDashboard.status, 404);
});

// ==================== Widget CRUD Tests ====================

currentTest = 'POST /dashboards/:connectionId/:dashboardId/widget';

test.serial(
	`${currentTest} should create a new widget in dashboard without query (query attached later)`,
	async (t) => {
		const { token } = await registerUserAndReturnUserInfo(app);
		const newConnection = getTestData(mockFactory).newEncryptedConnection;
		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const createDashboard = await request(app.getHttpServer())
			.post(`/dashboards/${connectionId}`)
			.send({ name: 'Dashboard with Widgets' })
			.set('Cookie', token)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const dashboardId = JSON.parse(createDashboard.text).id;

		// Create widget without query first (query is optional)
		const newWidget = {
			position_x: 0,
			position_y: 0,
			width: 4,
			height: 3,
		};

		const createWidget = await request(app.getHttpServer())
			.post(`/dashboard/${dashboardId}/widget/${connectionId}`)
			.send(newWidget)
			.set('Cookie', token)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const createWidgetRO = JSON.parse(createWidget.text);
		t.is(createWidget.status, 201);
		t.is(createWidgetRO.query_id, null);
		t.is(createWidgetRO.position_x, newWidget.position_x);
		t.is(createWidgetRO.position_y, newWidget.position_y);
		t.is(createWidgetRO.width, newWidget.width);
		t.is(createWidgetRO.height, newWidget.height);
		t.is(createWidgetRO.dashboard_id, dashboardId);
	},
);

test.serial(`${currentTest} should create widget and then attach query (proper workflow)`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Dashboard with All Widget Types' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const widgetTypes = ['table', 'chart', 'counter', 'text'];

	for (const widgetType of widgetTypes) {
		// First create widget without query
		const createWidget = await request(app.getHttpServer())
			.post(`/dashboard/${dashboardId}/widget/${connectionId}`)
			.send({})
			.set('Cookie', token)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createWidget.status, 201);
		const widgetId = JSON.parse(createWidget.text).id;

		// Then create a saved query with the specific widget_type
		const createQuery = await request(app.getHttpServer())
			.post(`/connection/${connectionId}/saved-query`)
			.send({
				name: `${widgetType} Query`,
				query_text: 'SELECT * FROM connection LIMIT 10',
				widget_type: widgetType,
			})
			.set('Cookie', token)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const queryId = JSON.parse(createQuery.text).id;

		// Then attach query to widget via update
		const updateWidget = await request(app.getHttpServer())
			.put(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`)
			.send({ query_id: queryId })
			.set('Cookie', token)
			.set('masterpwd', 'ahalaimahalai')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(updateWidget.status, 200);
		const updateWidgetRO = JSON.parse(updateWidget.text);
		t.is(updateWidgetRO.query_id, queryId);
	}
});

currentTest = 'PUT /dashboard/:dashboardId/widget/:widgetId';

test.serial(`${currentTest} should update widget`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Dashboard for Widget Update' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	// Create widget without query first
	const createWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/${connectionId}`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const widgetId = JSON.parse(createWidget.text).id;

	const updateData = {
		position_x: 2,
		position_y: 1,
		width: 6,
		height: 4,
	};

	const updateWidget = await request(app.getHttpServer())
		.put(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`)
		.send(updateData)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const updateWidgetRO = JSON.parse(updateWidget.text);
	t.is(updateWidget.status, 200);
	t.is(updateWidgetRO.position_x, updateData.position_x);
	t.is(updateWidgetRO.position_y, updateData.position_y);
	t.is(updateWidgetRO.width, updateData.width);
	t.is(updateWidgetRO.height, updateData.height);
});

currentTest = 'DELETE /dashboard/:dashboardId/widget/:widgetId';

test.serial(`${currentTest} should delete widget from dashboard`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Dashboard for Widget Delete' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	// Create widget without query
	const createWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/${connectionId}`)
		.send({})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const widgetId = JSON.parse(createWidget.text).id;

	const deleteWidget = await request(app.getHttpServer())
		.delete(`/dashboard/${dashboardId}/widget/${widgetId}/${connectionId}`)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(deleteWidget.status, 200);

	// Verify widget is deleted by getting dashboard
	const getDashboard = await request(app.getHttpServer())
		.get(`/dashboard/${dashboardId}/${connectionId}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Accept', 'application/json');

	const getDashboardRO = JSON.parse(getDashboard.text);
	t.is(getDashboard.status, 200);
	t.is(getDashboardRO.widgets.length, 0);
});

// ==================== Widget with Saved Query Tests ====================

currentTest = 'Widget with Saved Query';

test.serial(`${currentTest} should create widget linked to a saved query`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	// Create a saved query first (with widget_type)
	const createQuery = await request(app.getHttpServer())
		.post(`/connection/${connectionId}/saved-query`)
		.send({
			name: 'Test Query for Widget',
			query_text: 'SELECT * FROM connection LIMIT 10',
			widget_type: DashboardWidgetTypeEnum.Table,
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const queryId = JSON.parse(createQuery.text).id;

	// Create dashboard
	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Dashboard with Query Widget' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	// Create widget linked to saved query
	const createWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/${connectionId}`)
		.send({
			query_id: queryId,
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const createWidgetRO = JSON.parse(createWidget.text);
	t.is(createWidget.status, 201);
	t.is(createWidgetRO.query_id, queryId);
});

test.serial(`${currentTest} should fail to create widget with non-existent query`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const newConnection = getTestData(mockFactory).newEncryptedConnection;
	const createdConnection = await request(app.getHttpServer())
		.post('/connection')
		.send(newConnection)
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const connectionId = JSON.parse(createdConnection.text).id;

	const createDashboard = await request(app.getHttpServer())
		.post(`/dashboards/${connectionId}`)
		.send({ name: 'Dashboard with Invalid Query' })
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const dashboardId = JSON.parse(createDashboard.text).id;

	const fakeQueryId = faker.string.uuid();

	const createWidget = await request(app.getHttpServer())
		.post(`/dashboard/${dashboardId}/widget/${connectionId}`)
		.send({
			query_id: fakeQueryId,
		})
		.set('Cookie', token)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(createWidget.status, 400);
});
