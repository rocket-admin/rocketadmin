/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { QueryOrderingEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { getTestData } from '../../utils/get-test-data.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { ValidationError } from 'class-validator';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
let currentTest;

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
	app.getHttpServer().listen(0);
});

test.after(async () => {
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

currentTest = 'GET /settings/';

test.serial(`${currentTest} should throw an exception when tableName is missing`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const tableName = '';
		const findSettingsResponce = await request(app.getHttpServer())
			.get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findSettingsResponce.status, 400);
		const findSettingsRO = JSON.parse(findSettingsResponce.text);
		t.is(findSettingsRO.message, Messages.TABLE_NAME_MISSING);
	} catch (e) {
		console.error(e);
	}
});

test.serial(`${currentTest} should throw an exception when connectionId is missing`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const _createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = '';
		const tableName = faker.lorem.words();
		const findSettingsResponce = await request(app.getHttpServer())
			.get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findSettingsResponce.status, 400);
		const findSettingsRO = JSON.parse(findSettingsResponce.text);
		t.is(findSettingsRO.message, Messages.CONNECTION_ID_MISSING);
	} catch (e) {
		console.error(e);
	}
});

test.serial(
	`${currentTest} should return an empty connection settings object, when setting does not exists for this table in connection`,
	async (t) => {
		try {
			const newConnection = getTestData(mockFactory).newConnectionToTestDB;
			const { token } = await registerUserAndReturnUserInfo(app);

			const createdConnection = await request(app.getHttpServer())
				.post('/connection')
				.send(newConnection)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const connectionId = JSON.parse(createdConnection.text).id;

			const tableName = faker.lorem.words();
			const findSettingsResponce = await request(app.getHttpServer())
				.get(`/settings/?connectionId=${connectionId}&tableName=${tableName}`)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(findSettingsResponce.status, 200);
			const findSettingsRO = JSON.parse(findSettingsResponce.text);
			t.deepEqual(findSettingsRO, {});
		} catch (e) {
			console.error(e);
		}
	},
);

test.serial(`${currentTest} should return connection settings object`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const tableName = 'connection';
		const createTableSettingsDTO = mockFactory.generateTableSettings(
			connectionId,
			tableName,
			['title'],
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);

		const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
			undefined,
			3,
			QueryOrderingEnum.DESC,
			'port',
		);

		const createPersonalTableSettingsResponse = await request(app.getHttpServer())
			.put(`/settings/personal/${connectionId}`)
			.query({ tableName: tableName })
			.send(createPersonalTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createPersonalTableSettingsResponse.status, 200);

		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 201);

		const findSettingsResponce = await request(app.getHttpServer())
			.get(`/settings/?connectionId=${connectionId}&tableName=connection`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const findSettingsRO = JSON.parse(findSettingsResponce.text);
		t.is(Object.hasOwn(findSettingsRO, 'id'), true);
		t.is(findSettingsRO.table_name, 'connection');
		t.is(findSettingsRO.display_name, createTableSettingsDTO.display_name);
		t.deepEqual(findSettingsRO.search_fields, ['title']);
		t.deepEqual(findSettingsRO.excluded_fields, []);
		t.deepEqual(findSettingsRO.readonly_fields, []);
		t.deepEqual(findSettingsRO.sortable_by, []);
		t.deepEqual(findSettingsRO.autocomplete_columns, []);
		t.deepEqual(findSettingsRO.identification_fields, []);
		t.is(findSettingsRO.connection_id, connectionId);
	} catch (e) {
		console.error(e);
	}
});

currentTest = 'POST /settings/';

test.serial(`${currentTest} should return created table settings`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const createTableSettingsDTO = mockFactory.generateTableSettings(
			connectionId,
			'connection',
			['title'],
			undefined,

			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);

		const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
			undefined,
			3,
			QueryOrderingEnum.DESC,
			'port',
		);

		const createPersonalTableSettingsResponse = await request(app.getHttpServer())
			.put(`/settings/personal/${connectionId}`)
			.query({ tableName: 'connection' })
			.send(createPersonalTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createPersonalTableSettingsResponse.status, 200);

		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=connection`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 201);

		const findSettingsResponce = await request(app.getHttpServer())
			.get(`/settings/?connectionId=${connectionId}&tableName=connection`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const findSettingsRO = JSON.parse(findSettingsResponce.text);
		t.is(Object.hasOwn(findSettingsRO, 'id'), true);
		t.is(findSettingsRO.table_name, 'connection');
		t.is(findSettingsRO.display_name, createTableSettingsDTO.display_name);
		t.deepEqual(findSettingsRO.search_fields, ['title']);
		t.deepEqual(findSettingsRO.excluded_fields, []);
		t.deepEqual(findSettingsRO.readonly_fields, []);
		t.deepEqual(findSettingsRO.sortable_by, []);
		t.deepEqual(findSettingsRO.autocomplete_columns, []);
		t.is(findSettingsRO.connection_id, connectionId);
	} catch (e) {
		console.error(e);
	}
});

test.serial(`${currentTest} should throw exception when tableName is missing`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const createTableSettingsDTO = mockFactory.generateTableSettings(
			connectionId,
			'connection',
			['title'],
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);

		const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
			undefined,
			3,
			QueryOrderingEnum.DESC,
			'port',
		);

		const createPersonalTableSettingsResponse = await request(app.getHttpServer())
			.put(`/settings/personal/${connectionId}`)
			.query({ tableName: 'connection' })
			.send(createPersonalTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createPersonalTableSettingsResponse.status, 200);
		const tableName = '';
		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 400);
		const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
		t.is(createTableSettingsRO.message, Messages.TABLE_NAME_MISSING);
	} catch (e) {
		console.error(e);
	}
});

test.serial(`${currentTest} should throw exception when connectionId is missing`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const _createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = '';

		const createTableSettingsDTO = mockFactory.generateTableSettings(
			connectionId,
			'connection',
			['title'],
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);

		const tableName = faker.lorem.words(1);
		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 400);
		const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
		t.is(createTableSettingsRO.message, Messages.CONNECTION_ID_MISSING);
	} catch (e) {
		console.error(e);
	}
});

test.serial(`${currentTest} should throw exception when search_fields is not an array`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
			connectionId,
			'connection',
			'title',
			undefined,
			undefined,
			undefined,
			undefined,
		);

		const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
			undefined,
			3,
			QueryOrderingEnum.DESC,
			'port',
		);

		const createPersonalTableSettingsResponse = await request(app.getHttpServer())
			.put(`/settings/personal/${connectionId}`)
			.query({ tableName: 'connection' })
			.send(createPersonalTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createPersonalTableSettingsResponse.status, 200);

		const tableName = 'connection';
		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 400);
		const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
		t.is(createTableSettingsRO.message, 'The field "search_fields" must be an array');
	} catch (e) {
		console.error(e);
	}
});

test.serial(`${currentTest} should throw exception when excluded_fields is not an array`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
			connectionId,
			'connection',
			['title'],
			'type',
			undefined,
			undefined,
			undefined,
		);

		const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
			undefined,
			3,
			QueryOrderingEnum.DESC,
			'port',
		);

		const createPersonalTableSettingsResponse = await request(app.getHttpServer())
			.put(`/settings/personal/${connectionId}`)
			.query({ tableName: 'connection' })
			.send(createPersonalTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createPersonalTableSettingsResponse.status, 200);

		const tableName = 'connection';
		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 400);
		const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
		t.is(createTableSettingsRO.message, 'The field "excluded_fields" must be an array');
	} catch (e) {
		console.error(e);
	}
});

test.serial(`${currentTest} should throw exception when sortable_by is not an array`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;

		const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
			connectionId,
			'connection',
			['title'],
			undefined,
			undefined,
			'type',
			undefined,
		);

		const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
			undefined,
			3,
			QueryOrderingEnum.DESC,
			'port',
		);

		const createPersonalTableSettingsResponse = await request(app.getHttpServer())
			.put(`/settings/personal/${connectionId}`)
			.query({ tableName: 'connection' })
			.send(createPersonalTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createPersonalTableSettingsResponse.status, 200);

		const tableName = 'connection';
		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 400);
		const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
		t.is(createTableSettingsRO.message, 'The field "sortable_by" must be an array');
	} catch (e) {
		console.error(e);
	}
});

test.serial(
	`${currentTest} should throw exception when there are no such field in the table for searching`,
	async (t) => {
		try {
			const newConnection = getTestData(mockFactory).newConnectionToTestDB;
			const { token } = await registerUserAndReturnUserInfo(app);

			const createdConnection = await request(app.getHttpServer())
				.post('/connection')
				.send(newConnection)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const connectionId = JSON.parse(createdConnection.text).id;

			const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
				connectionId,
				'connection',
				['testField'],
				undefined,

				undefined,
				undefined,
				undefined,
			);

			const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
				undefined,
				3,
				QueryOrderingEnum.DESC,
				'port',
			);

			const createPersonalTableSettingsResponse = await request(app.getHttpServer())
				.put(`/settings/personal/${connectionId}`)
				.query({ tableName: 'connection' })
				.send(createPersonalTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPersonalTableSettingsResponse.status, 200);

			const tableName = 'connection';
			const createTableSettingsResponse = await request(app.getHttpServer())
				.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
				.send(createTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createTableSettingsResponse.status, 400);
			const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
			t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
		} catch (e) {
			console.error(e);
		}
	},
);

test.serial(
	`${currentTest} should throw exception when there are no such field in the table for excluding`,
	async (t) => {
		try {
			const newConnection = getTestData(mockFactory).newConnectionToTestDB;
			const { token } = await registerUserAndReturnUserInfo(app);

			const createdConnection = await request(app.getHttpServer())
				.post('/connection')
				.send(newConnection)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const connectionId = JSON.parse(createdConnection.text).id;

			const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
				connectionId,
				'connection',
				['type'],
				['testField'],
				undefined,
				undefined,
				undefined,
			);

			const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
				undefined,
				3,
				QueryOrderingEnum.DESC,
				'port',
			);

			const createPersonalTableSettingsResponse = await request(app.getHttpServer())
				.put(`/settings/personal/${connectionId}`)
				.query({ tableName: 'connection' })
				.send(createPersonalTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPersonalTableSettingsResponse.status, 200);

			const tableName = 'connection';
			const createTableSettingsResponse = await request(app.getHttpServer())
				.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
				.send(createTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createTableSettingsResponse.status, 400);
			const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
			t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
		} catch (e) {
			console.error(e);
		}
	},
);

test.serial(
	`${currentTest} should throw exception when there are no such field in the table for read only`,
	async (t) => {
		try {
			const newConnection = getTestData(mockFactory).newConnectionToTestDB;
			const { token } = await registerUserAndReturnUserInfo(app);

			const createdConnection = await request(app.getHttpServer())
				.post('/connection')
				.send(newConnection)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const connectionId = JSON.parse(createdConnection.text).id;

			const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
				connectionId,
				'connection',
				['type'],
				undefined,
				['testField'],
				undefined,
				undefined,
			);

			const tableName = 'connection';
			const createTableSettingsResponse = await request(app.getHttpServer())
				.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
				.send(createTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createTableSettingsResponse.status, 400);
			const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
			t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
		} catch (e) {
			console.error(e);
		}
	},
);

test.serial(
	`${currentTest} should throw exception when there are no such field in the table for sorting`,
	async (t) => {
		try {
			const newConnection = getTestData(mockFactory).newConnectionToTestDB;
			const { token } = await registerUserAndReturnUserInfo(app);

			const createdConnection = await request(app.getHttpServer())
				.post('/connection')
				.send(newConnection)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const connectionId = JSON.parse(createdConnection.text).id;

			const createTableSettingsDTO = mockFactory.generateTableSettingsWithoutTypes(
				connectionId,
				'connection',
				['type'],
				undefined,
				undefined,
				['testField'],
				undefined,
			);

			const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
				undefined,
				3,
				QueryOrderingEnum.DESC,
				'port',
			);

			const createPersonalTableSettingsResponse = await request(app.getHttpServer())
				.put(`/settings/personal/${connectionId}`)
				.query({ tableName: 'connection' })
				.send(createPersonalTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPersonalTableSettingsResponse.status, 200);

			const tableName = 'connection';
			const createTableSettingsResponse = await request(app.getHttpServer())
				.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
				.send(createTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createTableSettingsResponse.status, 400);
			const createTableSettingsRO = JSON.parse(createTableSettingsResponse.text);
			t.is(createTableSettingsRO.message, 'There are no such fields: testField - in the table "connection"');
		} catch (e) {
			console.error(e);
		}
	},
);

currentTest = 'GET /table/rows/:slug personal settings priority';

test.skip(
	`${currentTest} should use personal table settings over common table settings when both exist`,
	async (t) => {
		try {
			const newConnection = getTestData(mockFactory).newConnectionToTestDB;
			const { token } = await registerUserAndReturnUserInfo(app);

			const createdConnection = await request(app.getHttpServer())
				.post('/connection')
				.send(newConnection)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const connectionId = JSON.parse(createdConnection.text).id;
			const tableName = 'connection';

			// Create common table settings with specific list_fields
			const createTableSettingsDTO = mockFactory.generateTableSettings(
				connectionId,
				tableName,
				['title'],
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
			);
			createTableSettingsDTO.list_fields = ['id', 'title', 'type'];
			createTableSettingsDTO.list_per_page = 10;
			createTableSettingsDTO.ordering = QueryOrderingEnum.ASC;
			createTableSettingsDTO.ordering_field = 'id';

			const createTableSettingsResponse = await request(app.getHttpServer())
				.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
				.send(createTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createTableSettingsResponse.status, 201);

			// Create personal table settings with different values
			const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
				['id', 'title'], // different list_fields
				5, // different list_per_page
				QueryOrderingEnum.DESC, // different ordering
				'title', // different ordering_field
			);

			const createPersonalTableSettingsResponse = await request(app.getHttpServer())
				.put(`/settings/personal/${connectionId}`)
				.query({ tableName: tableName })
				.send(createPersonalTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPersonalTableSettingsResponse.status, 200);

			// Get table rows and verify personal settings are applied
			const getTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${tableName}`)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getTableRowsResponse.status, 200);
			const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

			// Verify that personal settings list_per_page is used (5 instead of 10)
			t.is(getTableRowsRO.pagination.perPage, 5);

			// Verify that personal list_fields are used - rows should only have id and title
			const rowKeys = Object.keys(getTableRowsRO.rows[0]);
			t.true(rowKeys.includes('id'));
			t.true(rowKeys.includes('title'));
			t.false(rowKeys.includes('type')); // type was in common settings but not in personal
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`${currentTest} should use common table settings when personal table settings do not exist`, async (t) => {
	try {
		const newConnection = getTestData(mockFactory).newConnectionToTestDB;
		const { token } = await registerUserAndReturnUserInfo(app);

		const createdConnection = await request(app.getHttpServer())
			.post('/connection')
			.send(newConnection)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const connectionId = JSON.parse(createdConnection.text).id;
		const tableName = 'connection';

		// Create only common table settings with specific list_fields
		const createTableSettingsDTO = mockFactory.generateTableSettings(
			connectionId,
			tableName,
			['title'],
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		createTableSettingsDTO.list_fields = ['id', 'title', 'type'];
		createTableSettingsDTO.list_per_page = 7;
		createTableSettingsDTO.ordering = QueryOrderingEnum.ASC;
		createTableSettingsDTO.ordering_field = 'id';

		const createTableSettingsResponse = await request(app.getHttpServer())
			.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
			.send(createTableSettingsDTO)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(createTableSettingsResponse.status, 201);

		// No personal table settings created

		// Get table rows and verify common settings are applied
		const getTableRowsResponse = await request(app.getHttpServer())
			.get(`/table/rows/${connectionId}?tableName=${tableName}`)
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(getTableRowsResponse.status, 200);
		const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

		// Verify that common settings list_per_page is used (7)
		t.is(getTableRowsRO.pagination.perPage, 7);

		// Verify that common list_fields are used - rows should have id, title, and type
		const rowKeys = Object.keys(getTableRowsRO.rows[0]);
		t.true(rowKeys.includes('id'));
		t.true(rowKeys.includes('title'));
		t.true(rowKeys.includes('type'));
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`${currentTest} should use common table settings list_fields when personal list_fields is empty array`,
	async (t) => {
		try {
			const newConnection = getTestData(mockFactory).newConnectionToTestDB;
			const { token } = await registerUserAndReturnUserInfo(app);

			const createdConnection = await request(app.getHttpServer())
				.post('/connection')
				.send(newConnection)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			const connectionId = JSON.parse(createdConnection.text).id;
			const tableName = 'connection';

			// Create common table settings with specific list_fields
			const createTableSettingsDTO = mockFactory.generateTableSettings(
				connectionId,
				tableName,
				['title'],
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
			);
			createTableSettingsDTO.list_fields = ['id', 'title'];
			createTableSettingsDTO.list_per_page = 8;

			const createTableSettingsResponse = await request(app.getHttpServer())
				.post(`/settings?connectionId=${connectionId}&tableName=${tableName}`)
				.send(createTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createTableSettingsResponse.status, 201);

			// Create personal table settings with empty list_fields but different list_per_page
			const createPersonalTableSettingsDTO = mockFactory.generatePersonalTableSettingsDto(
				[], // empty list_fields - should fall back to common
				4, // different list_per_page
				QueryOrderingEnum.DESC,
				'title',
			);

			const createPersonalTableSettingsResponse = await request(app.getHttpServer())
				.put(`/settings/personal/${connectionId}`)
				.query({ tableName: tableName })
				.send(createPersonalTableSettingsDTO)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createPersonalTableSettingsResponse.status, 200);

			// Get table rows and verify settings are applied correctly
			const getTableRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${tableName}`)
				.set('Cookie', token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(getTableRowsResponse.status, 200);
			const getTableRowsRO = JSON.parse(getTableRowsResponse.text);

			// Verify that personal settings list_per_page is used (4)
			t.is(getTableRowsRO.pagination.perPage, 4);

			// Verify that common list_fields are used since personal was empty
			const rowKeys = Object.keys(getTableRowsRO.rows[0]);
			t.true(rowKeys.includes('id'));
			t.true(rowKeys.includes('title'));
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);
