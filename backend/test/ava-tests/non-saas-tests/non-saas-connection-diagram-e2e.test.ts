import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getRandomTestTableName } from '../../utils/get-random-test-table-name.js';
import { getTestKnex } from '../../utils/get-test-knex.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;

let parentTableName: string;
let childTableName: string;

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	_testUtils = moduleFixture.get<TestUtils>(TestUtils);

	app = moduleFixture.createNestApplication() as any;
	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			exceptionFactory(validationErrors: ValidationError[] = []) {
				return new ValidationException(validationErrors);
			},
		}),
	);
	await app.init();
	app.getHttpServer().listen(0);

	// Seed two related SQL tables in the postgres test DB once.
	const postgresConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
	parentTableName = getRandomTestTableName();
	childTableName = getRandomTestTableName();
	const knex = getTestKnex(postgresConnection);
	await knex.schema.dropTableIfExists(childTableName);
	await knex.schema.dropTableIfExists(parentTableName);
	await knex.schema.createTable(parentTableName, (table) => {
		table.increments('id').primary();
		table.string('name', 100).notNullable();
	});
	await knex.schema.createTable(childTableName, (table) => {
		table.increments('id').primary();
		table.string('label', 100);
		table.integer('parent_id').references('id').inTable(parentTableName);
	});
});

test.after(async () => {
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

test.serial(
	'GET /connection/diagram/:connectionId > returns Mermaid erDiagram and description for SQL connection',
	async (t) => {
		const { token } = await registerUserAndReturnUserInfo(app);
		const connectionDto = mockFactory.generateConnectionToTestPostgresDBInDocker();

		const createConnectionResponse = await request(app.getHttpServer())
			.post('/connection')
			.send(connectionDto)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createConnectionResponse.status, 201);
		const created = JSON.parse(createConnectionResponse.text);

		const diagramResponse = await request(app.getHttpServer())
			.get(`/connection/diagram/${created.id}`)
			.set('Cookie', token)
			.set('Accept', 'application/json');

		t.is(diagramResponse.status, 200);
		const body = diagramResponse.body;

		t.is(body.connectionId, created.id);
		t.is(body.databaseType, 'postgres');
		t.is(typeof body.diagram, 'string');
		t.is(typeof body.description, 'string');
		t.is(typeof body.generatedAt, 'string');
		t.notThrows(() => new Date(body.generatedAt));

		t.true(body.diagram.startsWith('erDiagram'));
		t.true(body.diagram.includes(parentTableName), 'diagram should mention parent table');
		t.true(body.diagram.includes(childTableName), 'diagram should mention child table');
		t.true(body.diagram.includes('PK'), 'diagram should mark primary key columns');
		t.true(body.diagram.includes('FK'), 'diagram should mark foreign key columns');
		t.true(body.diagram.includes('}o--||'), 'diagram should contain at least one many-to-one relationship arrow');

		t.true(body.description.includes(parentTableName));
		t.true(body.description.includes(childTableName));
		t.regex(body.description, /\d+ tables?/);
		t.regex(body.description, /\d+ foreign key relationships?/);
	},
);

test.serial('GET /connection/diagram/:connectionId > rejects non-SQL connection types with 400', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const mongoDto = mockFactory.generateConnectionToTestMongoDBInDocker();

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(mongoDto)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createConnectionResponse.status, 201);
	const created = JSON.parse(createConnectionResponse.text);

	const diagramResponse = await request(app.getHttpServer())
		.get(`/connection/diagram/${created.id}`)
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(diagramResponse.status, 400);
	t.is(diagramResponse.body.message, Messages.DIAGRAM_NOT_SUPPORTED_FOR_CONNECTION_TYPE);
});

test.serial('GET /connection/diagram/:connectionId > rejects unauthenticated requests', async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);
	const connectionDto = mockFactory.generateConnectionToTestPostgresDBInDocker();

	const createConnectionResponse = await request(app.getHttpServer())
		.post('/connection')
		.send(connectionDto)
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createConnectionResponse.status, 201);
	const created = JSON.parse(createConnectionResponse.text);

	const diagramResponse = await request(app.getHttpServer())
		.get(`/connection/diagram/${created.id}`)
		.set('Accept', 'application/json');

	t.is(diagramResponse.status, 401);
});
