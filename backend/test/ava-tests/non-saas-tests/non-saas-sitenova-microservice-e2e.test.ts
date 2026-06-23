/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
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
import { publicCrudCorsMiddleware } from '../../../src/middlewares/public-crud-cors.middleware.js';
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

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const testTables: Array<string> = [];
let currentTest;

// Microservice JWT (request_id claim) for the internal raw-query controller.
function microserviceAuthHeader(): string {
	const secret = appConfig.auth.microserviceJwtSecret as string;
	return `Bearer ${jwt.sign({ request_id: faker.string.uuid() }, secret, { expiresIn: '1h' })}`;
}

// The connection owner's user id is the `id` claim of the cookie token from registerUserAndReturnUserInfo.
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
	app.use(publicCrudCorsMiddleware);
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

// Provision a users/auth table in the connected DB via the internal raw-query endpoint (this is the
// agents-core pipeline's job at site-creation time). Returns the table name.
async function createUsersTable(connectionId: string, userId: string): Promise<string> {
	const usersTable = `sitenova_users_${faker.string.alpha({ length: 10, casing: 'lower' })}`;
	testTables.push(usersTable);
	const res = await request(app.getHttpServer())
		.post(`/internal/sitenova/raw-query/${connectionId}`)
		.send({
			userId,
			query: `CREATE TABLE ${usersTable} (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255), password VARCHAR(1024))`,
		})
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	if (res.status !== 201) {
		throw new Error(`Failed to create users table: ${res.status} ${res.text}`);
	}
	return usersTable;
}

async function enablePublicRead(connectionId: string, token: string, tableName: string): Promise<void> {
	await request(app.getHttpServer())
		.put(`/connection/public-permissions/${connectionId}`)
		.send({ tables: [{ tableName }] })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

currentTest = 'POST /internal/sitenova/raw-query/:connectionId (internal, microservice JWT)';

test.serial(
	`${currentTest} executes write-capable DDL/DML and rejects calls without the microservice JWT`,
	async (t) => {
		const { userId, connectionId } = await createConnectionAndTable();

		const newTableName = `sitenova_raw_${faker.string.alpha({ length: 10, casing: 'lower' })}`;
		testTables.push(newTableName);
		const insertedName = faker.person.firstName();

		const createTableResponse = await request(app.getHttpServer())
			.post(`/internal/sitenova/raw-query/${connectionId}`)
			.send({ userId, query: `CREATE TABLE ${newTableName} (id INT PRIMARY KEY, name VARCHAR(255))` })
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableResponse.status, 201);

		const insertResponse = await request(app.getHttpServer())
			.post(`/internal/sitenova/raw-query/${connectionId}`)
			.send({ userId, query: `INSERT INTO ${newTableName} (id, name) VALUES (1, '${insertedName}')` })
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(insertResponse.status, 201);

		const selectResponse = await request(app.getHttpServer())
			.post(`/internal/sitenova/raw-query/${connectionId}`)
			.send({ userId, query: `SELECT id, name FROM ${newTableName}` })
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(selectResponse.status, 201);
		t.true(JSON.stringify(JSON.parse(selectResponse.text).result).includes(insertedName));

		const noTokenResponse = await request(app.getHttpServer())
			.post(`/internal/sitenova/raw-query/${connectionId}`)
			.send({ userId, query: 'SELECT 1' })
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(noTokenResponse.status, 401);
	},
);

currentTest = 'POST /sitenova/:connectionId/auth/register|login (public end-user auth)';

test.serial(`${currentTest} registers a user, auto-logs-in, and never returns the password`, async (t) => {
	const { connectionId, userId } = await createConnectionAndTable();
	const usersTable = await createUsersTable(connectionId, userId);
	const email = faker.internet.email().toLowerCase();

	const registerResponse = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/register`)
		.send({ tableName: usersTable, email, password: 'secret123' })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(registerResponse.status, 201);
	const ro = JSON.parse(registerResponse.text);
	t.is(typeof ro.token, 'string');
	t.is(ro.user.email, email);
	t.is(Object.hasOwn(ro.user, 'password'), false);
});

test.serial(`${currentTest} rejects duplicate registration (409)`, async (t) => {
	const { connectionId, userId } = await createConnectionAndTable();
	const usersTable = await createUsersTable(connectionId, userId);
	const email = faker.internet.email().toLowerCase();
	const body = { tableName: usersTable, email, password: 'secret123' };

	const first = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/register`)
		.send(body)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(first.status, 201);

	const second = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/register`)
		.send(body)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(second.status, 409);
});

test.serial(`${currentTest} login succeeds with correct creds and fails (401) otherwise`, async (t) => {
	const { connectionId, userId } = await createConnectionAndTable();
	const usersTable = await createUsersTable(connectionId, userId);
	const email = faker.internet.email().toLowerCase();
	await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/register`)
		.send({ tableName: usersTable, email, password: 'secret123' })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const ok = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/login`)
		.send({ tableName: usersTable, email, password: 'secret123' })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(ok.status, 200);
	t.is(typeof JSON.parse(ok.text).token, 'string');

	const wrongPassword = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/login`)
		.send({ tableName: usersTable, email, password: 'WRONG' })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(wrongPassword.status, 401);

	const unknownEmail = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/login`)
		.send({ tableName: usersTable, email: 'nobody@example.com', password: 'secret123' })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(unknownEmail.status, 401);
});

currentTest = 'POST /sitenova/:connectionId/data/* writes (end-user JWT)';

async function registerAndGetToken(connectionId: string, usersTable: string): Promise<string> {
	const res = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/auth/register`)
		.send({ tableName: usersTable, email: faker.internet.email().toLowerCase(), password: 'secret123' })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return JSON.parse(res.text).token;
}

test.serial(`${currentTest} create/update/delete succeed with a valid token`, async (t) => {
	const { connectionId, userId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();
	const usersTable = await createUsersTable(connectionId, userId);
	const token = await registerAndGetToken(connectionId, usersTable);

	const fakeName = faker.person.firstName();
	const createRes = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/create`)
		.send({
			tableName: testTableName,
			row: { [testTableColumnName]: fakeName, [testTableSecondColumnName]: faker.internet.email() },
		})
		.set('Authorization', `Bearer ${token}`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createRes.status, 201);
	t.is(JSON.parse(createRes.text).row[testTableColumnName], fakeName);

	const updatedName = faker.person.firstName();
	const updateRes = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/update`)
		.send({ tableName: testTableName, primaryKey: { id: 1 }, row: { [testTableColumnName]: updatedName } })
		.set('Authorization', `Bearer ${token}`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(updateRes.status, 200);
	t.is(JSON.parse(updateRes.text).row[testTableColumnName], updatedName);

	const deleteRes = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/delete`)
		.send({ tableName: testTableName, primaryKey: { id: 2 } })
		.set('Authorization', `Bearer ${token}`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(deleteRes.status, 200);
	t.is(JSON.parse(deleteRes.text).row.id, 2);
});

test.serial(`${currentTest} create is rejected (401) without a token`, async (t) => {
	const { connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();
	const res = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/create`)
		.send({ tableName: testTableName, row: { [testTableColumnName]: faker.person.firstName() } })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(res.status, 401);
});

test.serial(`${currentTest} a token minted for another connection is rejected (401)`, async (t) => {
	const first = await createConnectionAndTable();
	const usersTable = await createUsersTable(first.connectionId, first.userId);
	const tokenForFirst = await registerAndGetToken(first.connectionId, usersTable);

	const second = await createConnectionAndTable();

	const res = await request(app.getHttpServer())
		.post(`/sitenova/${second.connectionId}/data/create`)
		.send({ tableName: second.testTableName, row: { [second.testTableColumnName]: faker.person.firstName() } })
		.set('Authorization', `Bearer ${tokenForFirst}`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(res.status, 401);
});

currentTest = 'POST /sitenova/:connectionId/data/rows|read (public read policy)';

test.serial(`${currentTest} reads are refused (403) until public access is enabled, then allowed`, async (t) => {
	const { connectionId, token, testTableName, testTableColumnName } = await createConnectionAndTable();

	const refused = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/rows`)
		.send({ tableName: testTableName, page: 1, perPage: 10 })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(refused.status, 403);

	await enablePublicRead(connectionId, token, testTableName);

	const rows = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/rows`)
		.send({ tableName: testTableName, page: 1, perPage: 10 })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(rows.status, 200);
	const rowsRO = JSON.parse(rows.text);
	t.is(Object.hasOwn(rowsRO, 'rows'), true);
	t.is(Object.hasOwn(rowsRO, 'pagination'), true);
	t.is(rowsRO.rows.length, 10);

	const read = await request(app.getHttpServer())
		.post(`/sitenova/${connectionId}/data/read`)
		.send({ tableName: testTableName, primaryKey: { id: 1 } })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(read.status, 200);
	t.is(JSON.parse(read.text).row.id, 1);
	t.is(typeof JSON.parse(read.text).row[testTableColumnName], 'string');
});
