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
import { TestUtils } from '../../utils/test.utils.js';
import { createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions } from '../../utils/user-with-different-permissions-utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

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

const connectionReadPolicy = (connectionId: string): string =>
	`permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

const tableReadPolicy = (connectionId: string, tableName: string): string =>
	`permit(\n  principal,\n  action == RocketAdmin::Action::"table:read",\n  resource == RocketAdmin::Table::"${connectionId}/${tableName}"\n);`;

const panelReadPolicy = (connectionId: string, panelId: string): string =>
	`permit(\n  principal,\n  action == RocketAdmin::Action::"panel:read",\n  resource == RocketAdmin::Panel::"${connectionId}/${panelId}"\n);`;

async function saveCedarPolicy(
	connectionId: string,
	groupId: string,
	adminToken: string,
	policyLines: Array<string>,
): Promise<void> {
	const savePolicyResponse = await request(app.getHttpServer())
		.post(`/connection/cedar-policy/${connectionId}`)
		.send({ cedarPolicy: policyLines.join('\n\n'), groupId })
		.set('Cookie', adminToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	if (savePolicyResponse.status !== 201) {
		throw new Error(`Failed to save cedar policy: ${savePolicyResponse.status} ${savePolicyResponse.text}`);
	}
}

async function createSavedQueryAsAdmin(connectionId: string, adminToken: string, queryText: string): Promise<string> {
	const createPanel = await request(app.getHttpServer())
		.post(`/connection/${connectionId}/saved-query`)
		.send({ name: 'Permission Test Query', query_text: queryText, widget_type: 'table' })
		.set('Cookie', adminToken)
		.set('masterpwd', 'ahalaimahalai')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	if (createPanel.status !== 201) {
		throw new Error(`Failed to create saved query: ${createPanel.status} ${createPanel.text}`);
	}
	return createPanel.body.id;
}

currentTest = 'POST /connection/:connectionId/query/test (table read permissions)';

test.serial(
	`${currentTest} should allow testing a query when user has read permission on the referenced table`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			await saveCedarPolicy(connectionId, groupId, testData.users.adminUserToken, [
				connectionReadPolicy(connectionId),
				tableReadPolicy(connectionId, tableName),
			]);

			const testQueryResponse = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/query/test`)
				.send({ query_text: `SELECT * FROM "${tableName}"` })
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(testQueryResponse.status, 201);
			t.true(Array.isArray(testQueryResponse.body.data));
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(`${currentTest} should return 403 when user lacks read permission on the referenced table`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const connectionId = testData.connections.firstId;
		const groupId = testData.groups.createdGroupId;
		const tableName = testData.firstTableInfo.testTableName;

		// Connection read only — no table read permission granted.
		await saveCedarPolicy(connectionId, groupId, testData.users.adminUserToken, [connectionReadPolicy(connectionId)]);

		const testQueryResponse = await request(app.getHttpServer())
			.post(`/connection/${connectionId}/query/test`)
			.send({ query_text: `SELECT * FROM "${tableName}"` })
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(testQueryResponse.status, 403);
		t.is(testQueryResponse.body.message, Messages.NO_READ_PERMISSION_FOR_TABLE(tableName));
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(
	`${currentTest} should return 403 for an indeterminate query when user has no table read permissions (all-tables fallback)`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			// Connection read only — no table read permission granted.
			await saveCedarPolicy(connectionId, groupId, testData.users.adminUserToken, [connectionReadPolicy(connectionId)]);

			// "SELECT 1" resolves to no concrete table, so the check falls back to requiring read on
			// every table in the connection — which this user does not have.
			const testQueryResponse = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/query/test`)
				.send({ query_text: 'SELECT 1' })
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(testQueryResponse.status, 403);
			t.true(testQueryResponse.body.message.includes('read permission'));
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'POST /connection/:connectionId/saved-query/:queryId/execute (table read permissions)';

test.serial(
	`${currentTest} should return 403 when executing a saved query touching a table the user cannot read`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			const panelId = await createSavedQueryAsAdmin(
				connectionId,
				testData.users.adminUserToken,
				`SELECT * FROM "${tableName}"`,
			);

			// Grant panel read (so PanelReadGuard passes) but withhold table read.
			await saveCedarPolicy(connectionId, groupId, testData.users.adminUserToken, [
				connectionReadPolicy(connectionId),
				panelReadPolicy(connectionId, panelId),
			]);

			const executeResponse = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query/${panelId}/execute`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(executeResponse.status, 403);
			t.is(executeResponse.body.message, Messages.NO_READ_PERMISSION_FOR_TABLE(tableName));
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	`${currentTest} should execute a saved query when user has both panel read and table read permissions`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;
			const tableName = testData.firstTableInfo.testTableName;

			const panelId = await createSavedQueryAsAdmin(
				connectionId,
				testData.users.adminUserToken,
				`SELECT * FROM "${tableName}"`,
			);

			await saveCedarPolicy(connectionId, groupId, testData.users.adminUserToken, [
				connectionReadPolicy(connectionId),
				panelReadPolicy(connectionId, panelId),
				tableReadPolicy(connectionId, tableName),
			]);

			const executeResponse = await request(app.getHttpServer())
				.post(`/connection/${connectionId}/saved-query/${panelId}/execute`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(executeResponse.status, 201);
			t.is(executeResponse.body.query_id, panelId);
			t.true(Array.isArray(executeResponse.body.data));
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);
