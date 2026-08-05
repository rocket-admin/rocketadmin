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

// --- plan 13 step 2b: the site runtime policy (manifest) write + the auth-table grant refusal ---

function siteRuntimePolicyRequest(connectionId: string, body: Record<string, unknown>): request.Test {
	return request(app.getHttpServer())
		.post(`/internal/agents/connection/site-runtime-policy/${connectionId}`)
		.send(body)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

currentTest = 'POST /internal/agents/connection/site-runtime-policy/:connectionId (internal, microservice JWT)';

test.serial(`${currentTest} stores the manifest and blocks public grants on its auth table`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

	const manifest = {
		auth: {
			tableName: 'site_users',
			emailField: 'email',
			passwordField: 'password',
			idColumn: 'id',
			returnableColumns: ['id', 'email'],
			allowedExtraColumns: [],
			registrationOpen: true,
		},
		ownedRead: [],
		write: [],
	};
	const written = await siteRuntimePolicyRequest(connectionId, { userId, policy: manifest });
	t.is(written.status, 201);
	t.is(JSON.parse(written.text).policy.auth.tableName, 'site_users');

	// The rule that used to be generation-prompt text only: the manifest's auth table can never be
	// publicly granted...
	const refusedTable = await grantRequest(connectionId, { userId, tables: [{ tableName: 'site_users' }] });
	t.is(refusedTable.status, 400);

	// ...and neither can a column whitelist naming the manifest's credential column, on any table.
	const refusedColumn = await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: ['password'] }],
	});
	t.is(refusedColumn.status, 400);

	// Nothing was granted by the refused requests, and unrelated tables still grant normally.
	const anonymousBefore = await anonymousRowsRequest(connectionId, testTableName);
	t.is(anonymousBefore.status, 403);
	const granted = await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: [testTableColumnName] }],
	});
	t.is(granted.status, 201);
});

test.serial(`${currentTest} refuses a user without connection:edit (403) and writes nothing`, async (t) => {
	const { userId, connectionId } = await createConnectionAndTable();
	const foreignUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const foreignUserId = userIdFromCookieToken(foreignUserToken);

	const refused = await siteRuntimePolicyRequest(connectionId, {
		userId: foreignUserId,
		policy: { auth: { tableName: 'site_users', emailField: 'email', passwordField: 'password' } },
	});
	t.is(refused.status, 403);

	// No manifest was stored: a public grant on that table by the real owner still succeeds.
	const granted = await grantRequest(connectionId, { userId, tables: [{ tableName: 'site_users' }] });
	t.is(granted.status, 201);
});

test.serial(`${currentTest} refuses a policy that is not a JSON object (400)`, async (t) => {
	const { userId, connectionId } = await createConnectionAndTable();

	const arrayPolicy = await siteRuntimePolicyRequest(connectionId, { userId, policy: [{ auth: {} }] });
	t.is(arrayPolicy.status, 400);

	const stringPolicy = await siteRuntimePolicyRequest(connectionId, { userId, policy: 'not-an-object' });
	t.is(stringPolicy.status, 400);
});

// --- plan 13 P0-3: a public column whitelist must bound the QUERY, not just the response ---
//
// `readableColumns` used to be applied only as a projection over rows the query had already
// returned, so an anonymous caller could still filter or search on a WITHHELD column and read its
// values back out of which rows came back (`pagination.total` as a per-character oracle over a
// password hash). These tests pin the fix on the core's anonymous `/table/crud` branch: the
// readable set now feeds filtering, search and the select list. (universal-backend enforces the
// same rule for the generated-site runtime — plan 13 Step 0.)
//
// The seeded table has 42 rows; `testTableColumnName` holds the value 'Vasia' in exactly 3 of them
// and `testTableSecondColumnName` holds a unique email per row. Assertions deliberately use a
// filter/search that matches a NON-EMPTY subset when applied, because the MySQL DAO's
// `getRowsCount` treats a filtered count of 0 as falsy and falls back to the whole-table count —
// so "total === 0" is not a usable signal here, while "total === 3 vs 42" is.

function anonymousCrudRowsRequest(
	connectionId: string,
	tableName: string,
	body: Record<string, unknown> = {},
	extraQuery = '',
): request.Test {
	return request(app.getHttpServer())
		.post(`/table/crud/rows/${connectionId}?tableName=${tableName}&page=1&perPage=10${extraQuery}`)
		.send(body)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

currentTest = 'POST /table/crud/rows/:connectionId (anonymous, public Cedar policy)';

test.serial(`${currentTest} returns only the publicly readable columns`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();
	await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: [testTableColumnName] }],
	});

	const response = await anonymousCrudRowsRequest(connectionId, testTableName);
	t.is(response.status, 200);
	const { rows } = JSON.parse(response.text);
	t.is(rows.length, 10);
	t.deepEqual(Object.keys(rows[0]), [testTableColumnName]);
	t.false(Object.keys(rows[0]).includes(testTableSecondColumnName));
	t.false(Object.keys(rows[0]).includes('id'));
});

test.serial(`${currentTest} ignores a filter on a withheld column (kills the pagination oracle)`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();
	// Grant the EMAIL column only — the name column (3 rows of 'Vasia') is withheld.
	await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: [testTableSecondColumnName] }],
	});

	// Body-filter form: before the fix this ran in SQL and answered "3 rows match 'Vasia'" about a
	// column the caller may not read. Now it is ignored exactly like a filter on a column that does
	// not exist, so the result set stays the unfiltered one.
	const bodyFiltered = await anonymousCrudRowsRequest(connectionId, testTableName, {
		filters: { [testTableColumnName]: { eq: 'Vasia' } },
	});
	t.is(bodyFiltered.status, 200);
	const bodyFilteredRO = JSON.parse(bodyFiltered.text);
	t.is(bodyFilteredRO.pagination.total, 42);
	t.is(bodyFilteredRO.rows.length, 10);
	t.deepEqual(Object.keys(bodyFilteredRO.rows[0]), [testTableSecondColumnName]);

	// Query-string filter form is bounded the same way.
	const queryFiltered = await anonymousCrudRowsRequest(
		connectionId,
		testTableName,
		{},
		`&f_${testTableColumnName}__eq=Vasia`,
	);
	t.is(queryFiltered.status, 200);
	t.is(JSON.parse(queryFiltered.text).pagination.total, 42);
});

test.serial(`${currentTest} never searches a withheld column`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();
	await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: [testTableSecondColumnName] }],
	});

	// 'Vasia' exists only in the withheld column: the search must match nothing rather than
	// returning those 3 rows (before the fix, search ILIKEd every column of the table).
	const response = await anonymousCrudRowsRequest(connectionId, testTableName, {}, '&search=Vasia');
	t.is(response.status, 200);
	const body = JSON.parse(response.text);
	t.is(body.rows.length, 0);
	t.not(body.pagination.total, 3);
});

test.serial(`${currentTest} still applies a filter and search on a readable column`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();
	await grantRequest(connectionId, {
		userId,
		tables: [{ tableName: testTableName, readableColumns: [testTableColumnName] }],
	});

	const filtered = await anonymousCrudRowsRequest(connectionId, testTableName, {
		filters: { [testTableColumnName]: { eq: 'Vasia' } },
	});
	t.is(filtered.status, 200);
	t.is(JSON.parse(filtered.text).pagination.total, 3);
	t.is(JSON.parse(filtered.text).rows.length, 3);

	const searched = await anonymousCrudRowsRequest(connectionId, testTableName, {}, '&search=Vasia');
	t.is(searched.status, 200);
	t.is(JSON.parse(searched.text).rows.length, 3);
});
