import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';
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
import { getTestKnex } from '../../utils/get-test-knex.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

// Covers the Postgres structure read for tables whose columns use user-defined types (enums and
// composite types) against a real catalog. The DAO describes all of them with two batched catalog
// queries (see the unit suite for the query count); this suite checks what those queries return.

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

const suffix = nanoid(6).replace(/[-_]/g, 'x').toLowerCase();
const enumTypeName = `mood_${suffix}`;
const compositeTypeName = `address_${suffix}`;
const tableName = `people_${suffix}`;

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
	await knex.raw(`CREATE TYPE "${enumTypeName}" AS ENUM ('happy', 'sad', 'neutral')`);
	await knex.raw(`CREATE TYPE "${compositeTypeName}" AS (street text, zip varchar(10))`);
	await knex.raw(
		`CREATE TABLE "${tableName}" (
			id serial PRIMARY KEY,
			mood "${enumTypeName}" NOT NULL,
			previous_mood "${enumTypeName}",
			home "${compositeTypeName}",
			note text
		)`,
	);
});

test.after(async () => {
	try {
		const knex = getTestKnex(getTestData(mockFactory).connectionToPostgres);
		await knex.raw(`DROP TABLE IF EXISTS "${tableName}"`);
		await knex.raw(`DROP TYPE IF EXISTS "${compositeTypeName}"`);
		await knex.raw(`DROP TYPE IF EXISTS "${enumTypeName}"`);
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

currentTest = 'GET /table/structure/:slug';

test.serial(`${currentTest} should describe enum and composite columns of a postgres table`, async (t) => {
	const connectionToTestDB = getTestData(mockFactory).connectionToPostgres;
	const firstUserToken = (await registerUserAndReturnUserInfo(app)).token;

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionToTestDB)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createConnectionResponse.status, 201);
	const createConnectionRO = JSON.parse(createConnectionResponse.text);

	const getTableStructure = await request(app.getHttpServer())
		.get(`/table/structure/${createConnectionRO.id}?tableName=${tableName}`)
		.set('Cookie', firstUserToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(getTableStructure.status, 200);
	const getTableStructureRO = JSON.parse(getTableStructure.text);

	t.is(getTableStructureRO.structure.length, 5);
	const byName = new Map<string, any>(getTableStructureRO.structure.map((column) => [column.column_name, column]));

	t.is(byName.get('id').data_type, 'integer');
	t.is(byName.get('id').data_type_params, undefined);

	t.is(byName.get('mood').data_type, 'enum');
	t.deepEqual(byName.get('mood').data_type_params, ['happy', 'sad', 'neutral']);
	t.is(byName.get('mood').allow_null, false);

	t.is(byName.get('previous_mood').data_type, 'enum');
	t.deepEqual(byName.get('previous_mood').data_type_params, ['happy', 'sad', 'neutral']);
	t.is(byName.get('previous_mood').allow_null, true);

	t.is(byName.get('home').data_type, compositeTypeName);
	t.deepEqual(byName.get('home').data_type_params, [
		{ column_name: 'street', data_type: 'text' },
		{ column_name: 'zip', data_type: 'character varying(10)' },
	]);

	t.is(byName.get('note').data_type, 'text');
	t.is(byName.get('note').data_type_params, undefined);
});
