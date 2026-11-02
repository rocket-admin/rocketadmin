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

// The SiteNova chat data agent's row writes (sitenova plan 85): the three internal endpoints that
// insert, update and delete rows on behalf of a RocketAdmin user. The suite pins the happy path on
// Postgres (the hosted-database engine), the Cedar refusal for a user without permissions, the
// microservice JWT gate and the "a key that names no row refuses the whole call" rule.

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const testTables: Array<string> = [];
let currentTest;

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
		const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
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
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
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

function rowsRequest(
	operation: 'insert' | 'update' | 'delete',
	connectionId: string,
	body: Record<string, unknown>,
	withAuth = true,
): request.Test {
	const req = request(app.getHttpServer())
		.post(`/internal/agents/ai/data/${connectionId}/rows/${operation}`)
		.send(body)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return withAuth ? req.set('Authorization', microserviceAuthHeader()) : req;
}

async function readRow(token: string, connectionId: string, tableName: string, id: number): Promise<request.Response> {
	return await request(app.getHttpServer())
		.get(`/table/crud/${connectionId}?tableName=${tableName}&id=${id}`)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

async function countRows(userId: string, connectionId: string, tableName: string): Promise<number> {
	const response = await request(app.getHttpServer())
		.post(`/internal/agents/ai/data/${connectionId}/raw-query`)
		.send({ userId, tableName, query: `SELECT count(*)::int AS total FROM "${tableName}"` })
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	// The Postgres DAO returns the driver's result object; the rows are under `rows`.
	return JSON.parse(response.text).result.rows[0].total;
}

currentTest = 'POST /internal/agents/ai/data/:connectionId/rows/insert|update|delete (internal, microservice JWT)';

test.serial(`${currentTest} inserts, updates and deletes rows for the connection owner`, async (t) => {
	const { token, userId, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();
	t.is(await countRows(userId, connectionId, testTableName), 42);

	const insertResponse = await rowsRequest('insert', connectionId, {
		userId,
		tableName: testTableName,
		rows: [
			{ [testTableColumnName]: 'Agent row one', [testTableSecondColumnName]: 'one@example.com' },
			{ [testTableColumnName]: 'Agent row two', [testTableSecondColumnName]: 'two@example.com' },
		],
	});
	t.is(insertResponse.status, 201, insertResponse.text);
	const inserted = JSON.parse(insertResponse.text);
	t.is(inserted.insertedCount, 2);
	t.is(inserted.insertedPrimaryKeys.length, 2);
	t.is(inserted.failure, undefined);
	const [firstId, secondId] = inserted.insertedPrimaryKeys.map((key: { id: number }) => key.id);
	t.is(typeof firstId, 'number');
	t.is(await countRows(userId, connectionId, testTableName), 44);

	const firstRow = await readRow(token, connectionId, testTableName, firstId);
	t.is(firstRow.status, 200);
	t.is(JSON.parse(firstRow.text).row[testTableColumnName], 'Agent row one');

	const updateResponse = await rowsRequest('update', connectionId, {
		userId,
		tableName: testTableName,
		primaryKeys: [{ id: firstId }, { id: secondId }],
		newValues: { [testTableColumnName]: 'Agent row renamed' },
	});
	t.is(updateResponse.status, 201, updateResponse.text);
	t.is(JSON.parse(updateResponse.text).updatedCount, 2);
	const renamed = await readRow(token, connectionId, testTableName, secondId);
	t.is(JSON.parse(renamed.text).row[testTableColumnName], 'Agent row renamed');
	t.is(JSON.parse(renamed.text).row[testTableSecondColumnName], 'two@example.com');

	const deleteResponse = await rowsRequest('delete', connectionId, {
		userId,
		tableName: testTableName,
		primaryKeys: [{ id: firstId }, { id: secondId }],
	});
	t.is(deleteResponse.status, 201, deleteResponse.text);
	t.is(JSON.parse(deleteResponse.text).deletedCount, 2);
	t.is(await countRows(userId, connectionId, testTableName), 42);
});

test.serial(`${currentTest} stops an insert at the first failing row and reports the rows before it`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

	const response = await rowsRequest('insert', connectionId, {
		userId,
		tableName: testTableName,
		rows: [
			{ [testTableColumnName]: 'Goes in' },
			// `id` is the autogenerated primary key: the row validator refuses a value for it.
			{ id: 999999, [testTableColumnName]: 'Refused' },
			{ [testTableColumnName]: 'Never reached' },
		],
	});
	t.is(response.status, 201, response.text);
	const ro = JSON.parse(response.text);
	t.is(ro.insertedCount, 1);
	t.is(ro.failure.rowIndex, 1);
	t.is(typeof ro.failure.message, 'string');
	t.is(await countRows(userId, connectionId, testTableName), 43);
});

test.serial(`${currentTest} refuses an update or delete whose key names no row, before any write`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

	const update = await rowsRequest('update', connectionId, {
		userId,
		tableName: testTableName,
		primaryKeys: [{ id: 1 }, { id: 987654321 }],
		newValues: { [testTableColumnName]: 'Must not land' },
	});
	t.is(update.status, 400);
	t.is(JSON.parse(update.text).message.includes('not found'), true);

	const remove = await rowsRequest('delete', connectionId, {
		userId,
		tableName: testTableName,
		primaryKeys: [{ id: 987654321 }],
	});
	t.is(remove.status, 400);
	t.is(await countRows(userId, connectionId, testTableName), 42);

	const badKey = await rowsRequest('delete', connectionId, {
		userId,
		tableName: testTableName,
		primaryKeys: [{ [testTableColumnName]: 'Vasia' }],
	});
	t.is(badKey.status, 400);
	t.is(await countRows(userId, connectionId, testTableName), 42);
});

test.serial(`${currentTest} rejects calls without the microservice JWT (401)`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

	const response = await rowsRequest(
		'insert',
		connectionId,
		{ userId, tableName: testTableName, rows: [{ [testTableColumnName]: 'x' }] },
		false,
	);
	t.is(response.status, 401);
});

test.serial(
	`${currentTest} denies a user with no permissions on the connection (403), nothing is written`,
	async (t) => {
		const { userId, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();
		const foreignUserToken = (await registerUserAndReturnUserInfo(app)).token;
		const foreignUserId = userIdFromCookieToken(foreignUserToken);

		const insert = await rowsRequest('insert', connectionId, {
			userId: foreignUserId,
			tableName: testTableName,
			rows: [{ [testTableColumnName]: 'x' }],
		});
		t.is(insert.status, 403);
		const update = await rowsRequest('update', connectionId, {
			userId: foreignUserId,
			tableName: testTableName,
			primaryKeys: [{ id: 1 }],
			newValues: { [testTableColumnName]: 'x' },
		});
		t.is(update.status, 403);
		const remove = await rowsRequest('delete', connectionId, {
			userId: foreignUserId,
			tableName: testTableName,
			primaryKeys: [{ id: 1 }],
		});
		t.is(remove.status, 403);
		t.is(await countRows(userId, connectionId, testTableName), 42);
	},
);

test.serial(
	`${currentTest} validates the body: an empty list, more than 100 rows and an unknown table are 400`,
	async (t) => {
		const { userId, connectionId, testTableName, testTableColumnName } = await createConnectionAndTable();

		const empty = await rowsRequest('insert', connectionId, { userId, tableName: testTableName, rows: [] });
		t.is(empty.status, 400);

		const tooMany = await rowsRequest('delete', connectionId, {
			userId,
			tableName: testTableName,
			primaryKeys: Array.from({ length: 101 }, (_unused, index) => ({ id: index + 1 })),
		});
		t.is(tooMany.status, 400);

		const unknownTable = await rowsRequest('insert', connectionId, {
			userId,
			tableName: `${testTableName}_missing`,
			rows: [{ [testTableColumnName]: 'x' }],
		});
		t.is(unknownTable.status, 400);
		t.is(await countRows(userId, connectionId, testTableName), 42);
	},
);
