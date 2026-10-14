import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { LogOperationTypeEnum } from '../../../src/enums/log-operation-type.enum.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import { getTestData } from '../../utils/get-test-data.js';
import { getTestKnex } from '../../utils/get-test-knex.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

// Bulk row deletion against a real Postgres: more keys than fit one statement (the DAO chunks at
// 1000 keys and runs the chunks in one transaction), a composite primary key (row-value IN list),
// and the audit log, which is now written with one batched INSERT per chunk instead of one
// INSERT per deleted row.

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

const suffix = nanoid(6).replace(/[-_]/g, 'x').toLowerCase();
const compositeTableName = `orders_${suffix}`;
const COMPOSITE_ROWS = 1200;
const COMPOSITE_KEYS_TO_DELETE = 1100;

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

	const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
	await knex.raw(
		`CREATE TABLE "${compositeTableName}" (
			region integer NOT NULL,
			code varchar(16) NOT NULL,
			note text,
			PRIMARY KEY (region, code)
		)`,
	);
	await knex.batchInsert(
		compositeTableName,
		Array.from({ length: COMPOSITE_ROWS }, (_, i) => ({ region: i % 10, code: `c${i}`, note: `row ${i}` })),
		200,
	);
});

test.after(async () => {
	try {
		const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
		await knex.raw(`DROP TABLE IF EXISTS "${compositeTableName}"`);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function createConnection(token: string): Promise<string> {
	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(getTestData(mockFactory).connectionToPostgres)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	if (createConnectionResponse.status !== 201) {
		throw new Error(`connection not created: ${createConnectionResponse.text}`);
	}
	return JSON.parse(createConnectionResponse.text).id;
}

currentTest = 'PUT /table/rows/delete/:slug';

test.serial(`${currentTest} should delete more rows than fit one statement and log every row`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const seedsCount = 2500;
	const { testTableName } = await createTestTable(connectionToTestDB, seedsCount);
	const connectionId = await createConnection(firstUserToken);

	const keysToDelete = 1500;
	const primaryKeysForDeletion = Array.from({ length: keysToDelete }, (_, i) => ({ id: i + 1 }));
	const deleteRowsInTableResponse = await request(app.getHttpServer())
		.put(`/table/rows/delete/${connectionId}?tableName=${testTableName}`)
		.send(primaryKeysForDeletion)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(deleteRowsInTableResponse.status, 200, deleteRowsInTableResponse.text);
	t.is(JSON.parse(deleteRowsInTableResponse.text), true);

	const knex = getTestKnex(connectionToTestDB);
	const remaining = await knex(testTableName).select('id').orderBy('id', 'asc');
	t.is(remaining.length, seedsCount - keysToDelete);
	t.is(remaining[0].id, keysToDelete + 1);
	t.is(remaining.at(-1).id, seedsCount);

	const tableLogsResponse = await request(app.getHttpServer())
		.get(`/logs/${connectionId}?tableName=${testTableName}&page=1&perPage=10`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(tableLogsResponse.status, 200);
	const tableLogsRO = JSON.parse(tableLogsResponse.text);
	t.is(tableLogsRO.pagination.total, keysToDelete);
	t.is(tableLogsRO.logs.length, 10);
	for (const log of tableLogsRO.logs) {
		t.is(log.operationType, LogOperationTypeEnum.deleteRow);
		t.is(typeof log.received_data.id, 'number');
		t.is(log.old_data.id, log.received_data.id);
	}
});

test.serial(`${currentTest} should delete rows of a table with a composite primary key`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const connectionId = await createConnection(firstUserToken);

	const primaryKeysForDeletion = Array.from({ length: COMPOSITE_KEYS_TO_DELETE }, (_, i) => ({
		code: `c${i}`,
		region: i % 10,
	}));
	const deleteRowsInTableResponse = await request(app.getHttpServer())
		.put(`/table/rows/delete/${connectionId}?tableName=${compositeTableName}`)
		.send(primaryKeysForDeletion)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(deleteRowsInTableResponse.status, 200, deleteRowsInTableResponse.text);

	const knex = getTestKnex(connectionToTestDB);
	const remaining = await knex(compositeTableName).select('region', 'code');
	t.is(remaining.length, COMPOSITE_ROWS - COMPOSITE_KEYS_TO_DELETE);
	t.true(remaining.every((row) => Number(row.code.slice(1)) >= COMPOSITE_KEYS_TO_DELETE));

	const tableLogsResponse = await request(app.getHttpServer())
		.get(`/logs/${connectionId}?tableName=${compositeTableName}&page=1&perPage=5`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(tableLogsResponse.status, 200);
	const tableLogsRO = JSON.parse(tableLogsResponse.text);
	t.is(tableLogsRO.pagination.total, COMPOSITE_KEYS_TO_DELETE);
	for (const log of tableLogsRO.logs) {
		t.is(log.old_data.note, `row ${log.received_data.code.slice(1)}`);
	}
});

test.serial(`${currentTest} should reject a key that is not the table primary key`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName } = await createTestTable(connectionToTestDB, 5);
	const connectionId = await createConnection(firstUserToken);

	const deleteRowsInTableResponse = await request(app.getHttpServer())
		.put(`/table/rows/delete/${connectionId}?tableName=${testTableName}`)
		.send([{ id: 1 }, {}])
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(deleteRowsInTableResponse.status, 400);

	const knex = getTestKnex(connectionToTestDB);
	const remaining = await knex(testTableName).count('* as count');
	t.is(Number(remaining[0].count), 5);
});

test.serial(`${currentTest} should accept a null key value and delete nothing for it`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const { testTableName } = await createTestTable(connectionToTestDB, 5);
	const connectionId = await createConnection(firstUserToken);

	const deleteRowsInTableResponse = await request(app.getHttpServer())
		.put(`/table/rows/delete/${connectionId}?tableName=${testTableName}`)
		.send([{ id: 2 }, { id: null }])
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(deleteRowsInTableResponse.status, 200, deleteRowsInTableResponse.text);

	const knex = getTestKnex(connectionToTestDB);
	const remaining = await knex(testTableName).select('id').orderBy('id', 'asc');
	t.deepEqual(
		remaining.map((row) => row.id),
		[1, 3, 4, 5],
	);
});
