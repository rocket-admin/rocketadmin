/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AccessLevelEnum } from '../../../src/enums/index.js';
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

//****************************** SAVE CEDAR POLICY ENDPOINT ******************************

currentTest = 'POST /connection/cedar-policy/:connectionId';

test.serial(
	`${currentTest} should save cedar policy and return classical permissions for connection read + table read`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
			].join('\n\n');

			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 201);
			const body = response.body;
			t.is(body.cedarPolicy, cedarPolicy);
			t.truthy(body.classicalPermissions);
			t.is(body.classicalPermissions.connection.accessLevel, AccessLevelEnum.readonly);
			t.is(body.classicalPermissions.group.accessLevel, AccessLevelEnum.none);
			t.is(body.classicalPermissions.tables.length, 1);
			t.is(body.classicalPermissions.tables[0].tableName, tableName);
			t.is(body.classicalPermissions.tables[0].accessLevel.visibility, true);
			t.is(body.classicalPermissions.tables[0].accessLevel.readonly, true);
			t.is(body.classicalPermissions.tables[0].accessLevel.add, false);
			t.is(body.classicalPermissions.tables[0].accessLevel.edit, false);
			t.is(body.classicalPermissions.tables[0].accessLevel.delete, false);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should save cedar policy with connection edit + table full access and generate correct classical permissions`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:edit",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"group:read",\n  resource == RocketAdmin::Group::"${groupId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"group:edit",\n  resource == RocketAdmin::Group::"${groupId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:add",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:edit",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:delete",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
			].join('\n\n');

			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 201);
			const body = response.body;
			t.is(body.classicalPermissions.connection.accessLevel, AccessLevelEnum.edit);
			t.is(body.classicalPermissions.group.accessLevel, AccessLevelEnum.edit);
			t.is(body.classicalPermissions.tables.length, 1);
			t.is(body.classicalPermissions.tables[0].tableName, tableName);
			t.is(body.classicalPermissions.tables[0].accessLevel.visibility, true);
			t.is(body.classicalPermissions.tables[0].accessLevel.readonly, true);
			t.is(body.classicalPermissions.tables[0].accessLevel.add, true);
			t.is(body.classicalPermissions.tables[0].accessLevel.edit, true);
			t.is(body.classicalPermissions.tables[0].accessLevel.delete, true);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should enforce saved cedar policy - user with table:read can read table rows`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			// Save cedar policy with connection:read + table:read
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Verify user with these permissions can read table rows
			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${tableName}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getTableRows.status, 200);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should enforce saved cedar policy - user without table:add cannot add rows`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;
			const testTableColumnName = testData.firstTableInfo.testTableColumnName;

			// Save cedar policy with only connection:read + table:read (no table:add)
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Verify user cannot add rows (no table:add permission)
			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${tableName}`)
				.send({ [testTableColumnName]: 'test_value' })
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(addRowResponse.status, 403);
			t.is(JSON.parse(addRowResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should enforce saved cedar policy - user with table:add can add rows`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;
			const testTableColumnName = testData.firstTableInfo.testTableColumnName;

			// Save cedar policy with connection:read + table:read + table:add
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:add",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
			].join('\n\n');

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// Verify user can add rows
			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${tableName}`)
				.send({ [testTableColumnName]: 'cedar_test_value' })
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(addRowResponse.status, 201);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should reject request when user does not have connection edit access`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

			// Simple user has readonly access, not edit
			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 403);
			t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(`${currentTest} should reject empty cedar policy string`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const connectionId = testData.connections.firstId;
		const groupId = testData.groups.createdGroupId;

		const response = await request(app.getHttpServer())
			.post(`/connection/cedar-policy/${connectionId}`)
			.send({ cedarPolicy: '', groupId })
			.set('Cookie', testData.users.adminUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(response.status, 400);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(`${currentTest} should reject request without groupId`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const connectionId = testData.connections.firstId;

		const cedarPolicy = `permit(\n  principal,\n  action,\n  resource\n);`;

		const response = await request(app.getHttpServer())
			.post(`/connection/cedar-policy/${connectionId}`)
			.send({ cedarPolicy })
			.set('Cookie', testData.users.adminUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(response.status, 400);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(
	`${currentTest} should reject saving cedar policy when group does not belong to connection`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const secondConnectionId = testData.connections.secondId;
			const groupId = testData.groups.createdGroupId;

			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${secondConnectionId}"\n);`;

			// Group belongs to first connection, but we're sending to second connection
			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${secondConnectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 400);
			t.is(JSON.parse(response.text).message, Messages.GROUP_NOT_FROM_THIS_CONNECTION);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should save cedar policy with dashboard permissions and return correct classical permissions`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:read",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:create",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"dashboard:edit",\n  resource == RocketAdmin::Dashboard::"${connectionId}/dash-1"\n);`,
			].join('\n\n');

			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 201);
			const body = response.body;
			t.is(body.classicalPermissions.connection.accessLevel, AccessLevelEnum.readonly);
			t.truthy(body.classicalPermissions.dashboards);
			t.is(body.classicalPermissions.dashboards.length, 1);
			t.is(body.classicalPermissions.dashboards[0].dashboardId, 'dash-1');
			t.is(body.classicalPermissions.dashboards[0].accessLevel.read, true);
			t.is(body.classicalPermissions.dashboards[0].accessLevel.create, true);
			t.is(body.classicalPermissions.dashboards[0].accessLevel.edit, true);
			t.is(body.classicalPermissions.dashboards[0].accessLevel.delete, false);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should overwrite previous permissions when saving new cedar policy`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			// First: save policy with full table access
			const fullPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:edit",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:add",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:edit",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:delete",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
			].join('\n\n');

			const firstResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy: fullPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(firstResponse.status, 201);
			t.is(firstResponse.body.classicalPermissions.connection.accessLevel, AccessLevelEnum.edit);
			t.is(firstResponse.body.classicalPermissions.tables[0].accessLevel.add, true);

			// Second: save policy with only read access (overwrite)
			const readOnlyPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`,
			].join('\n\n');

			const secondResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy: readOnlyPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(secondResponse.status, 201);
			t.is(secondResponse.body.classicalPermissions.connection.accessLevel, AccessLevelEnum.readonly);
			t.is(secondResponse.body.classicalPermissions.tables[0].accessLevel.add, false);
			t.is(secondResponse.body.classicalPermissions.tables[0].accessLevel.edit, false);
			t.is(secondResponse.body.classicalPermissions.tables[0].accessLevel.delete, false);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

//****************************** CEDAR POLICY REFERENCE VALIDATION TESTS ******************************

test.serial(
	`${currentTest} should reject cedar policy that references a foreign connection`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const secondConnectionId = testData.connections.secondId;
			const groupId = testData.groups.createdGroupId;

			// Policy references secondConnectionId as the resource
			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${secondConnectionId}"\n);`;

			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 400);
			t.is(JSON.parse(response.text).message, Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should reject cedar policy that references a group from another connection as resource`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const secondAdminGroupId = testData.groups.secondAdminGroupId;

			// Policy grants group:edit access to a group from the second connection
			const cedarPolicy = [
				`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`,
				`permit(\n  principal,\n  action == RocketAdmin::Action::"group:edit",\n  resource == RocketAdmin::Group::"${secondAdminGroupId}"\n);`,
			].join('\n\n');

			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 400);
			t.is(JSON.parse(response.text).message, Messages.CEDAR_POLICY_REFERENCES_FOREIGN_GROUP);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should reject cedar policy that references a table from another connection`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const secondConnectionId = testData.connections.secondId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${secondConnectionId}/${tableName}"\n);`;

			const response = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 400);
			t.is(JSON.parse(response.text).message, Messages.CEDAR_POLICY_REFERENCES_FOREIGN_CONNECTION);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);
