/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { dropTestTables } from '../../utils/drop-test-tables.js';
import { getTestData } from '../../utils/get-test-data.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

// POST /internal/agents/connection/public-permissions/:connectionId — the grant the
// website-generation agent's set_public_read_permissions tool performs after user approval
// (agents-core → this endpoint). Regression context: the endpoint was MISSING until 2026-07-30
// while agents-core already called it, so every agent grant 404ed and generated sites 403ed on
// anonymous reads — these tests pin the full chain down to the public /sitenova data read.

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const testTables: Array<string> = [];
let currentTest;

// Microservice JWT (request_id claim) for the internal agents controller.
function microserviceAuthHeader(): string {
	const secret = appConfig.auth.microserviceJwtSecret as string;
	return `Bearer ${jwt.sign({ request_id: faker.string.uuid() }, secret, { expiresIn: '1h' })}`;
}

function userIdFromCookieToken(cookieToken: string): string {
	const decoded = jwt.decode(cookieToken.split('=')[1]) as { id: string };
	return decoded.id;
}

test.before(async () => {
	setSaasEnvVariable();
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
	await createInitialTestUser(app);
	app.getHttpServer().listen(0);
});

test.after(async () => {
	try {
		const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
		await dropTestTables(testTables, connectionToTestDB);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnectionAndTable(): Promise<{
	token: string;
	userId: string;
	connectionId: string;
	testTableName: string;
	testTableColumnName: string;
	testTableSecondColumnName: string;
}> {
	const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
	const token = (await registerUserAndReturnUserInfo(app)).token;
	const userId = userIdFromCookieToken(token);
	const { testTableName, testTableColumnName, testTableSecondColumnName } = await createTestTable(connectionToTestDB);
	testTables.push(testTableName);

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	return {
		token,
		userId,
		connectionId: JSON.parse(createConnectionResponse.text).id,
		testTableName,
		testTableColumnName,
		testTableSecondColumnName,
	};
}

function grantRequest(connectionId: string, body: Record<string, unknown>, withAuth = true): request.Test {
	const req = request(app.getHttpServer())
		.post(`/internal/agents/connection/public-permissions/${connectionId}`)
		.send(body)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return withAuth ? req.set('Authorization', microserviceAuthHeader()) : req;
}

function anonymousRowsRequest(connectionId: string, tableName: string): request.Test {
	return request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/rows`)
		.send({ tableName, page: 1, perPage: 10 })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

currentTest = 'POST /internal/agents/connection/public-permissions/:connectionId (internal, microservice JWT)';

test.serial(`${currentTest} grants public read for the owner and unlocks anonymous /sitenova reads`, async (t) => {
	const { userId, connectionId, testTableName } = await createConnectionAndTable();

	// The exact prod symptom: anonymous reads 403 before any grant.
	const before = await anonymousRowsRequest(connectionId, testTableName);
	t.is(before.status, 403);

	const granted = await grantRequest(connectionId, { userId, tables: [{ tableName: testTableName }] });
	t.is(granted.status, 201);
	const grantedRO = JSON.parse(granted.text);
	t.is(grantedRO.enabled, true);
	t.deepEqual(
		grantedRO.tables.map((table: { tableName: string }) => table.tableName),
		[testTableName],
	);

	const after = await anonymousRowsRequest(connectionId, testTableName);
	t.is(after.status, 200);
	t.is(JSON.parse(after.text).rows.length, 10);
});

test.serial(`${currentTest} merges into existing public permissions (default mode)`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	const first = await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: [testTableColumnName] }],
	});
	t.is(first.status, 201);

	const second = await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: [testTableSecondColumnName] }],
	});
	t.is(second.status, 201);
	const merged = JSON.parse(second.text);
	t.is(merged.enabled, true);
	const entry = merged.tables.find((table: { tableName: string }) => table.tableName === testTableName);
	t.truthy(entry);
	t.deepEqual([...entry.readableColumns].sort(), [testTableColumnName, testTableSecondColumnName].sort());

	// An all-columns grant (no readableColumns) wins over any column whitelist.
	const allColumns = await grantRequest(connectionId, { userId, tables: [{ tableName: testTableName }] });
	t.is(allColumns.status, 201);
	const allColumnsEntry = JSON.parse(allColumns.text).tables.find(
		(table: { tableName: string }) => table.tableName === testTableName,
	);
	t.truthy(allColumnsEntry);
	t.is(!allColumnsEntry.readableColumns || allColumnsEntry.readableColumns.length === 0, true);
});

test.serial(`${currentTest} mode=replace resets the public table set (empty array disables)`, async (t) => {
	const { userId, connectionId, testTableName } = await createConnectionAndTable();

	await grantRequest(connectionId, { userId, tables: [{ tableName: testTableName }] });
	const disabled = await grantRequest(connectionId, { userId, tables: [], mode: 'replace' });
	t.is(disabled.status, 201);
	const disabledRO = JSON.parse(disabled.text);
	t.is(disabledRO.enabled, false);
	t.deepEqual(disabledRO.tables, []);

	const anonymous = await anonymousRowsRequest(connectionId, testTableName);
	t.is(anonymous.status, 403);
});

test.serial(`${currentTest} rejects calls without the microservice JWT (401)`, async (t) => {
	const { userId, connectionId, testTableName } = await createConnectionAndTable();

	const response = await grantRequest(connectionId, { userId, tables: [{ tableName: testTableName }] }, false);
	t.is(response.status, 401);
});

test.serial(`${currentTest} refuses a user without connection:edit (403) and grants nothing`, async (t) => {
	const { connectionId, testTableName } = await createConnectionAndTable();
	const foreignUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const foreignUserId = userIdFromCookieToken(foreignUserToken);

	const refused = await grantRequest(connectionId, {
		userId: foreignUserId,
		tables: [{ tableName: testTableName }],
	});
	t.is(refused.status, 403);

	const anonymous = await anonymousRowsRequest(connectionId, testTableName);
	t.is(anonymous.status, 403);
});
