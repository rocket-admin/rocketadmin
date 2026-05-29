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
	'POST /connection/diagram/:connectionId/preview > marks an ADD COLUMN as new and highlights diagram',
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

		const previewResponse = await request(app.getHttpServer())
			.post(`/connection/diagram/${created.id}/preview`)
			.send({ sqlCommands: [`ALTER TABLE ${parentTableName} ADD COLUMN nickname VARCHAR(50)`] })
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(previewResponse.status, 201, previewResponse.text);
		const body = previewResponse.body;

		t.is(body.connectionId, created.id);
		t.is(body.databaseType, 'postgres');
		t.true(body.diagram.startsWith('erDiagram'));
		t.true(body.diagram.includes('nickname'), 'diagram should include the new column');
		t.true(body.diagram.includes('NEW'), 'diagram should mark the new column with NEW');
		t.deepEqual(body.diff.addedColumns[parentTableName], ['nickname']);
		t.deepEqual(body.diff.addedTables, []);
		t.deepEqual(body.diff.droppedTables, []);
		t.is(body.diff.statementResults.length, 1);
		t.is(body.diff.statementResults[0].status, 'applied');
		t.true(body.description.includes('new columns: nickname'));
	},
);

test.serial(
	'POST /connection/diagram/:connectionId/preview > marks a CREATE TABLE as added and styles it green',
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

		const newTable = getRandomTestTableName();
		const previewResponse = await request(app.getHttpServer())
			.post(`/connection/diagram/${created.id}/preview`)
			.send({
				sqlCommands: [
					`CREATE TABLE ${newTable} (id SERIAL PRIMARY KEY, parent_ref INTEGER REFERENCES ${parentTableName}(id), payload TEXT)`,
				],
			})
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(previewResponse.status, 201, previewResponse.text);
		const body = previewResponse.body;

		t.true(body.diagram.includes(newTable), 'diagram should mention the new table');
		t.true(body.diagram.includes('classDef addedEntity'), 'diagram should declare the addedEntity class');
		t.true(body.diagram.includes('fill:#d4edda'), 'classDef should use a green fill');
		t.true(body.diagram.includes(`class ${newTable} addedEntity`), 'diagram should attach class to new table alias');
		t.deepEqual(body.diff.addedTables, [newTable]);
		t.truthy(body.diff.addedForeignKeys[newTable]);
		t.is(body.diff.statementResults[0].status, 'applied');
	},
);

test.serial('POST /connection/diagram/:connectionId/preview > marks a DROP COLUMN in the diff', async (t) => {
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

	const previewResponse = await request(app.getHttpServer())
		.post(`/connection/diagram/${created.id}/preview`)
		.send({ sqlCommands: [`ALTER TABLE ${childTableName} DROP COLUMN label`] })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(previewResponse.status, 201, previewResponse.text);
	const body = previewResponse.body;

	t.deepEqual(body.diff.droppedColumns[childTableName], ['label']);
	t.is(body.diff.statementResults[0].status, 'applied');
	t.notRegex(
		body.diagram,
		/\s+(varchar|character\s*varying)\s+label\b/i,
		'dropped column should not appear in the diagram body',
	);
});

test.serial(
	'POST /connection/diagram/:connectionId/preview > reports parse errors per statement without failing the request',
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

		const previewResponse = await request(app.getHttpServer())
			.post(`/connection/diagram/${created.id}/preview`)
			.send({
				sqlCommands: [`ALTER TABLE ${parentTableName} ADD COLUMN good_col INTEGER`, `THIS IS NOT VALID SQL`],
			})
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(previewResponse.status, 201, previewResponse.text);
		const body = previewResponse.body;
		t.is(body.diff.statementResults.length, 2);
		t.is(body.diff.statementResults[0].status, 'applied');
		t.is(body.diff.statementResults[1].status, 'error');
		t.regex(body.diff.statementResults[1].message, /parse error/);
		t.deepEqual(body.diff.addedColumns[parentTableName], ['good_col']);
	},
);

test.serial(
	'POST /connection/diagram/:connectionId/preview > validates body and rejects empty sqlCommands array',
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

		const previewResponse = await request(app.getHttpServer())
			.post(`/connection/diagram/${created.id}/preview`)
			.send({ sqlCommands: [] })
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(previewResponse.status, 400);
	},
);

test.serial('POST /connection/diagram/:connectionId/preview > rejects non-SQL connection types with 400', async (t) => {
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

	const previewResponse = await request(app.getHttpServer())
		.post(`/connection/diagram/${created.id}/preview`)
		.send({ sqlCommands: ['CREATE TABLE x (id SERIAL PRIMARY KEY)'] })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(previewResponse.status, 400);
	t.is(previewResponse.body.message, Messages.DIAGRAM_NOT_SUPPORTED_FOR_CONNECTION_TYPE);
});

test.serial('POST /connection/diagram/:connectionId/preview > rejects unauthenticated requests', async (t) => {
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

	const previewResponse = await request(app.getHttpServer())
		.post(`/connection/diagram/${created.id}/preview`)
		.send({ sqlCommands: ['CREATE TABLE x (id SERIAL PRIMARY KEY)'] })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(previewResponse.status, 401);
});
