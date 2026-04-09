/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { TestUtils } from '../../utils/test.utils.js';
import { createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions } from '../../utils/user-with-different-permissions-utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

const mockFactory = new MockFactory();

test.before(async () => {
	process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
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
		delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

//****************************** DASHBOARD PERMISSIONS ******************************

currentTest = 'Dashboard permissions';

test.serial(
	`${currentTest} should allow listing dashboards when user has read access to a specific dashboard via cedar policy`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates a dashboard
			const createDashboard = await request(app.getHttpServer())
				.post(`/dashboards/${connectionId}`)
				.send({ name: 'Test Dashboard', description: 'Test description' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createDashboard.status, 201);
			const dashboardId = createDashboard.body.id;

			// Save cedar policy granting read access to the specific dashboard only (no __new__ sentinel)
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == RocketAdmin::Dashboard::"${connectionId}/${dashboardId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user lists dashboards — should succeed and return only the permitted dashboard
			const listDashboards = await request(app.getHttpServer())
				.get(`/dashboards/${connectionId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(listDashboards.status, 200);
			const dashboards = listDashboards.body;
			t.is(Array.isArray(dashboards), true);
			t.is(dashboards.length, 1);
			t.is(dashboards[0].id, dashboardId);
			t.is(dashboards[0].name, 'Test Dashboard');
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should return only dashboards the user has read access to, not all dashboards`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates two dashboards
			const createDashboard1 = await request(app.getHttpServer())
				.post(`/dashboards/${connectionId}`)
				.send({ name: 'Allowed Dashboard' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createDashboard1.status, 201);
			const allowedDashboardId = createDashboard1.body.id;

			const createDashboard2 = await request(app.getHttpServer())
				.post(`/dashboards/${connectionId}`)
				.send({ name: 'Forbidden Dashboard' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createDashboard2.status, 201);

			// Save cedar policy granting read access only to the first dashboard
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == RocketAdmin::Dashboard::"${connectionId}/${allowedDashboardId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user lists dashboards — should only see the allowed one
			const listDashboards = await request(app.getHttpServer())
				.get(`/dashboards/${connectionId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(listDashboards.status, 200);
			const dashboards = listDashboards.body;
			t.is(dashboards.length, 1);
			t.is(dashboards[0].id, allowedDashboardId);
			t.is(dashboards[0].name, 'Allowed Dashboard');
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should return empty array when user has no dashboard read permissions`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates a dashboard
			const createDashboard = await request(app.getHttpServer())
				.post(`/dashboards/${connectionId}`)
				.send({ name: 'Hidden Dashboard' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createDashboard.status, 201);

			// Save cedar policy with connection read only, no dashboard permissions
			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user lists dashboards — should get empty array
			const listDashboards = await request(app.getHttpServer())
				.get(`/dashboards/${connectionId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(listDashboards.status, 200);
			t.is(listDashboards.body.length, 0);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should allow reading a specific dashboard when user has read access to it`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates a dashboard
			const createDashboard = await request(app.getHttpServer())
				.post(`/dashboards/${connectionId}`)
				.send({ name: 'Readable Dashboard' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createDashboard.status, 201);
			const dashboardId = createDashboard.body.id;

			// Save cedar policy granting read access to the dashboard
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == RocketAdmin::Dashboard::"${connectionId}/${dashboardId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user reads the specific dashboard
			const getDashboard = await request(app.getHttpServer())
				.get(`/dashboard/${dashboardId}/${connectionId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getDashboard.status, 200);
			t.is(getDashboard.body.id, dashboardId);
			t.is(getDashboard.body.name, 'Readable Dashboard');
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

//****************************** PANEL (SAVED QUERY) PERMISSIONS ******************************

test.serial(
	`${currentTest} should allow listing panels when user has read access to a specific panel via cedar policy`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates a saved query
			const createPanel = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'Test Query', query_text: 'SELECT 1', widget_type: 'table' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel.status, 201);
			const panelId = createPanel.body.id;

			// Save cedar policy granting panel read access
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:read",\n  resource == RocketAdmin::Panel::"${connectionId}/${panelId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user lists panels — should succeed and return only the permitted panel
			const listPanels = await request(app.getHttpServer())
				.get(`/connection/${connectionId}/saved-queries`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(listPanels.status, 200);
			const panels = listPanels.body;
			t.is(Array.isArray(panels), true);
			t.is(panels.length, 1);
			t.is(panels[0].id, panelId);
			t.is(panels[0].name, 'Test Query');
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should return only panels the user has read access to, not all panels`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates two saved queries
			const createPanel1 = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'Allowed Query', query_text: 'SELECT 1', widget_type: 'table' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel1.status, 201);
			const allowedPanelId = createPanel1.body.id;

			const createPanel2 = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'Forbidden Query', query_text: 'SELECT 2', widget_type: 'table' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel2.status, 201);

			// Save cedar policy granting read access only to the first panel
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:read",\n  resource == RocketAdmin::Panel::"${connectionId}/${allowedPanelId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user lists panels — should only see the allowed one
			const listPanels = await request(app.getHttpServer())
				.get(`/connection/${connectionId}/saved-queries`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(listPanels.status, 200);
			t.is(listPanels.body.length, 1);
			t.is(listPanels.body[0].id, allowedPanelId);
			t.is(listPanels.body[0].name, 'Allowed Query');
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should return empty array when user has no panel read permissions`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates a saved query
			const createPanel = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'Hidden Query', query_text: 'SELECT 1', widget_type: 'table' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel.status, 201);

			// Save cedar policy with connection read only, no panel permissions
			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user lists panels — should get empty array
			const listPanels = await request(app.getHttpServer())
				.get(`/connection/${connectionId}/saved-queries`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(listPanels.status, 200);
			t.is(listPanels.body.length, 0);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should allow reading a specific panel when user has read access to it`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates a saved query
			const createPanel = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'Readable Query', query_text: 'SELECT 1', widget_type: 'table' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel.status, 201);
			const panelId = createPanel.body.id;

			// Save cedar policy granting panel read
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:read",\n  resource == RocketAdmin::Panel::"${connectionId}/${panelId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user reads the specific panel
			const getPanel = await request(app.getHttpServer())
				.get(`/connection/${connectionId}/saved-query/${panelId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getPanel.status, 200);
			t.is(getPanel.body.id, panelId);
			t.is(getPanel.body.name, 'Readable Query');
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should return 403 when user reads a specific panel without permission`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates two panels
			const createPanel1 = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'Allowed Query', query_text: 'SELECT 1', widget_type: 'table' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel1.status, 201);
			const allowedPanelId = createPanel1.body.id;

			const createPanel2 = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'Forbidden Query', query_text: 'SELECT 2', widget_type: 'table' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel2.status, 201);
			const forbiddenPanelId = createPanel2.body.id;

			// Save cedar policy granting read only to first panel
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:read",\n  resource == RocketAdmin::Panel::"${connectionId}/${allowedPanelId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user tries to read the forbidden panel — should get 403
			const getPanel = await request(app.getHttpServer())
				.get(`/connection/${connectionId}/saved-query/${forbiddenPanelId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getPanel.status, 403);
			t.is(getPanel.body.message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should return 403 when user creates a panel without panel create permission`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Save cedar policy with connection read only, no panel create
			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user tries to create a panel — should get 403
			const createPanel = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query`)
				.send({ name: 'New Query', query_text: 'SELECT 1', widget_type: 'table' })
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPanel.status, 403);
			t.is(createPanel.body.message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should return 403 when user reads a specific dashboard without permission`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Admin creates two dashboards
			const createDashboard1 = await request(app.getHttpServer())
				.post(`/dashboards/${connectionId}`)
				.send({ name: 'Allowed Dashboard' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createDashboard1.status, 201);
			const allowedDashboardId = createDashboard1.body.id;

			const createDashboard2 = await request(app.getHttpServer())
				.post(`/dashboards/${connectionId}`)
				.send({ name: 'Forbidden Dashboard' })
				.set('Cookie', testData.users.adminUserToken)
				.set('masterpwd', 'ahalaimahalai')
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createDashboard2.status, 201);
			const forbiddenDashboardId = createDashboard2.body.id;

			// Save cedar policy granting read access only to the first dashboard
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == RocketAdmin::Dashboard::"${connectionId}/${allowedDashboardId}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Simple user tries to read the forbidden dashboard — should get 403
			const getDashboard = await request(app.getHttpServer())
				.get(`/dashboard/${forbiddenDashboardId}/${connectionId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getDashboard.status, 403);
			t.is(getDashboard.body.message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);
