/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AccessLevelEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createInitialTestUser } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';
import {
	createConnectionAndInviteUserWithConnectionEditOnly,
	createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection,
	createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions,
	createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions,
} from '../../utils/user-with-different-permissions-utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

const mockFactory = new MockFactory();

test.before(async () => {
	setSaasEnvVariable();
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
	await createInitialTestUser(app);
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

//****************************** ADMIN GROUP (isMain=true) - FULL ACCESS VIA CEDAR ******************************

currentTest = 'GET /connections/';

test.serial(`${currentTest} should return connections where admin group user has edit access via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const findAll = await request(app.getHttpServer())
			.get('/connections')
			.set('Content-Type', 'application/json')
			.set('Cookie', testData.users.simpleUserToken)
			.set('Accept', 'application/json');

		t.is(findAll.status, 200);

		const result = findAll.body.connections;
		t.is(result.length, 1);
		t.is(Object.hasOwn(result[0], 'connection'), true);
		t.is(Object.hasOwn(result[0], 'accessLevel'), true);
		t.is(result[0].accessLevel, AccessLevelEnum.edit);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'GET /connection/one/:slug';

test.serial(`${currentTest} should return a found connection for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const searchedConnectionId = testData.connections.firstId;
		const findOneResponce = await request(app.getHttpServer())
			.get(`/connection/one/${searchedConnectionId}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', testData.users.simpleUserToken)
			.set('Accept', 'application/json');
		t.is(findOneResponce.status, 200);

		const result = findOneResponce.body.connection;
		t.is(result.type, 'postgres');
		t.is(Object.hasOwn(result, 'host'), true);
		t.is(typeof result.port, 'number');
		t.is(Object.hasOwn(result, 'createdAt'), true);
		t.is(Object.hasOwn(result, 'updatedAt'), true);
		t.is(Object.hasOwn(result, 'password'), false);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(
	`${currentTest} should return limited connection info when admin group user reads connection without permission via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const searchedConnectionId = testData.connections.secondId;
			const findOneResponce = await request(app.getHttpServer())
				.get(`/connection/one/${searchedConnectionId}`)
				.set('Content-Type', 'application/json')
				.set('Cookie', testData.users.simpleUserToken)
				.set('Accept', 'application/json');
			t.is(findOneResponce.status, 200);
			const findOneRO = JSON.parse(findOneResponce.text);
			const connectionKeys: Array<string> = Object.keys(findOneRO.connection);
			for (const keyName of connectionKeys) {
				t.is(Constants.CONNECTION_KEYS_NONE_PERMISSION.includes(keyName), true);
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT /connection';

test.serial(`${currentTest} should return updated connection for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const updateConnection = mockFactory.generateUpdateConnectionDto();
		const updateConnectionResponse = await request(app.getHttpServer())
			.put(`/connection/${testData.connections.firstId}`)
			.send(updateConnection)
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(updateConnectionResponse.status, 200);
		const result = updateConnectionResponse.body.connection;
		t.is(Object.hasOwn(result, 'createdAt'), true);
		t.is(Object.hasOwn(result, 'updatedAt'), true);
		t.is(Object.hasOwn(result, 'password'), false);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(
	`${currentTest} should throw an exception when admin group user tries to update connection without permission via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${testData.connections.secondId}`)
				.send(updateConnection)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(updateConnectionResponse.status, 403);
			t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'DELETE /connection/:slug';

test.serial(`${currentTest} should return delete result for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const response = await request(app.getHttpServer())
			.put(`/connection/delete/${testData.connections.firstId}`)
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(response.status, 200);

		const findOneResponce = await request(app.getHttpServer())
			.get(`/connection/one/${testData.connections.firstId}`)
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findOneResponce.status, 400);
		const { message } = JSON.parse(findOneResponce.text);
		t.is(message, Messages.CONNECTION_NOT_FOUND);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(
	`${currentTest} should throw an exception when admin group user tries to delete connection without permission via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const response = await request(app.getHttpServer())
				.put(`/connection/delete/${testData.connections.secondId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(response.status, 403);
			t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'POST /connection/group/:slug';

test.serial(`${currentTest} should return a created group for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const newGroup1 = mockFactory.generateCreateGroupDto1();
		const createGroupResponse = await request(app.getHttpServer())
			.post(`/connection/group/${testData.connections.firstId}`)
			.set('Cookie', testData.users.simpleUserToken)
			.send(newGroup1)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(createGroupResponse.status, 201);
		const result = JSON.parse(createGroupResponse.text);
		t.is(result.title, newGroup1.title);
		t.is(Object.hasOwn(result, 'users'), true);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'GET /connection/groups/:slug';

test.serial(`${currentTest} should return groups for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const response = await request(app.getHttpServer())
			.get(`/connection/groups/${testData.connections.firstId}`)
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(response.status, 200);
		const result = JSON.parse(response.text);
		t.is(result.length > 0, true);
		t.is(result[0].accessLevel, AccessLevelEnum.edit);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'GET /connection/tables/:slug';

test.serial(`${currentTest} should return all tables for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const getTablesInConnection = await request(app.getHttpServer())
			.get(`/connection/tables/${testData.connections.firstId}`)
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(getTablesInConnection.status, 200);
		const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
		t.is(getTablesInConnectionRO.length > 0, true);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'GET /table/rows/:slug';

test.serial(`${currentTest} should return found rows for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const getTableRows = await request(app.getHttpServer())
			.get(
				`/table/rows/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
			)
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(getTableRows.status, 200);
		const getTableRowsRO = JSON.parse(getTableRows.text);
		t.is(Object.hasOwn(getTableRowsRO, 'rows'), true);
		t.is(Object.hasOwn(getTableRowsRO, 'primaryColumns'), true);
		t.is(Object.hasOwn(getTableRowsRO, 'pagination'), true);
		t.is(Object.hasOwn(getTableRowsRO, 'structure'), true);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'POST /table/row/:slug';

test.serial(`${currentTest} should return added row for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const randomName = faker.person.firstName();
		const randomEmail = faker.internet.email();
		const created_at = new Date();
		const updated_at = new Date();
		const addRowInTable = await request(app.getHttpServer())
			.post(
				`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
			)
			.send({
				[testData.firstTableInfo.testTableColumnName]: randomName,
				[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
				created_at: created_at,
				updated_at: updated_at,
			})
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(addRowInTable.status, 201);
		const addRowInTableRO = JSON.parse(addRowInTable.text);
		t.is(Object.hasOwn(addRowInTableRO.row, 'id'), true);
		t.is(addRowInTableRO.row[testData.firstTableInfo.testTableColumnName], randomName);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'PUT /table/row/:slug';

test.serial(`${currentTest} should return updated row for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const randomName = faker.person.firstName();
		const randomEmail = faker.internet.email();
		const created_at = new Date();
		const updated_at = new Date();
		const updateRowInTable = await request(app.getHttpServer())
			.put(
				`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=1`,
			)
			.send({
				[testData.firstTableInfo.testTableColumnName]: randomName,
				[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
				created_at: created_at,
				updated_at: updated_at,
			})
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(updateRowInTable.status, 200);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'DELETE /table/row/:slug';

test.serial(`${currentTest} should return delete result for admin group user via Cedar`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const deleteRowInTable = await request(app.getHttpServer())
			.delete(
				`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=19`,
			)
			.set('Cookie', testData.users.simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(deleteRowInTable.status, 200);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

//****************************** CUSTOM GROUP: connection=readonly, group=edit ******************************

currentTest = 'GET /connections/';

test.serial(
	`${currentTest} should return connections with readonly access for custom group user via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const findAll = await request(app.getHttpServer())
				.get('/connections')
				.set('Content-Type', 'application/json')
				.set('Cookie', testData.users.simpleUserToken)
				.set('Accept', 'application/json');

			t.is(findAll.status, 200);

			const result = findAll.body.connections;
			const targetConnection = result.find(
				({ connection }: any) => connection.id === testData.connections.firstId,
			);
			t.is(Object.hasOwn(targetConnection, 'connection'), true);
			t.is(Object.hasOwn(targetConnection, 'accessLevel'), true);
			t.is(targetConnection.accessLevel, AccessLevelEnum.readonly);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'GET /connection/one/:slug';

test.serial(
	`${currentTest} should return a found connection for readonly custom group user via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const findOneResponce = await request(app.getHttpServer())
				.get(`/connection/one/${testData.connections.firstId}`)
				.set('Content-Type', 'application/json')
				.set('Cookie', testData.users.simpleUserToken)
				.set('Accept', 'application/json');
			t.is(findOneResponce.status, 200);
			const result = findOneResponce.body.connection;
			t.is(Object.hasOwn(result, 'host'), true);
			t.is(Object.hasOwn(result, 'createdAt'), true);
			t.is(Object.hasOwn(result, 'updatedAt'), true);
			t.is(Object.hasOwn(result, 'password'), false);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT /connection';

test.serial(
	`${currentTest} should throw an exception when readonly custom group user tries to update connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${testData.connections.firstId}`)
				.send(updateConnection)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(updateConnectionResponse.status, 403);
			t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'DELETE /connection/:slug';

test.serial(
	`${currentTest} should throw an exception when readonly custom group user tries to delete connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const response = await request(app.getHttpServer())
				.put(`/connection/delete/${testData.connections.firstId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(response.status, 403);
			t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'GET /connection/groups/:slug';

test.serial(
	`${currentTest} should return groups for custom group user with group edit permission via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const response = await request(app.getHttpServer())
				.get(`/connection/groups/${testData.connections.firstId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(response.status, 200);
			const result = JSON.parse(response.text);
			t.is(result.length > 0, true);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'GET /connection/tables/:slug';

test.serial(
	`${currentTest} should return tables for custom group user with table visibility via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const getTablesInConnection = await request(app.getHttpServer())
				.get(`/connection/tables/${testData.connections.firstId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesInConnection.status, 200);
			const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
			t.is(getTablesInConnectionRO.length > 0, true);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'GET /table/rows/:slug';

test.serial(
	`${currentTest} should return found rows for custom group user with table visibility via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const getTableRows = await request(app.getHttpServer())
				.get(
					`/table/rows/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
				)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 200);
			const getTableRowsRO = JSON.parse(getTableRows.text);
			t.is(Object.hasOwn(getTableRowsRO, 'rows'), true);
			t.is(Object.hasOwn(getTableRowsRO, 'primaryColumns'), true);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should return added row for custom group user with table add permission via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const addRowInTable = await request(app.getHttpServer())
				.post(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
				)
				.send({
					[testData.firstTableInfo.testTableColumnName]: randomName,
					[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 201);
			const addRowInTableRO = JSON.parse(addRowInTable.text);
			t.is(Object.hasOwn(addRowInTableRO.row, 'id'), true);
			t.is(addRowInTableRO.row[testData.firstTableInfo.testTableColumnName], randomName);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should throw an exception when custom group user without edit permission tries to update row via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const updateRowInTable = await request(app.getHttpServer())
				.put(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=2`,
				)
				.send({
					[testData.firstTableInfo.testTableColumnName]: randomName,
					[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowInTable.status, 403);
			t.is(JSON.parse(updateRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should return delete result for custom group user with table delete permission via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const deleteRowInTable = await request(app.getHttpServer())
				.delete(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=19`,
				)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowInTable.status, 200);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

//****************************** CUSTOM GROUP: connection=none, group=none, table-only perms ******************************

currentTest = 'GET /connection/one/:slug';

test.serial(
	`${currentTest} should return limited connection info for table-only permissions group user via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const findOneResponce = await request(app.getHttpServer())
				.get(`/connection/one/${testData.connections.firstId}`)
				.set('Content-Type', 'application/json')
				.set('Cookie', testData.users.simpleUserToken)
				.set('Accept', 'application/json');
			t.is(findOneResponce.status, 200);
			const findOneRO = JSON.parse(findOneResponce.text);
			const connectionKeys: Array<string> = Object.keys(findOneRO.connection);
			for (const keyName of connectionKeys) {
				t.is(Constants.CONNECTION_KEYS_NONE_PERMISSION.includes(keyName), true);
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT /connection';

test.serial(
	`${currentTest} should throw an exception when table-only permissions user tries to update connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${testData.connections.firstId}`)
				.send(updateConnection)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(updateConnectionResponse.status, 403);
			t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'DELETE /connection/:slug';

test.serial(
	`${currentTest} should throw an exception when table-only permissions user tries to delete connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const response = await request(app.getHttpServer())
				.put(`/connection/delete/${testData.connections.firstId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(response.status, 403);
			t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'GET /connection/tables/:slug';

test.serial(
	`${currentTest} should return tables for table-only permissions user with table visibility via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const getTablesInConnection = await request(app.getHttpServer())
				.get(`/connection/tables/${testData.connections.firstId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesInConnection.status, 200);
			const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
			t.is(getTablesInConnectionRO.length > 0, true);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'GET /table/rows/:slug';

test.serial(
	`${currentTest} should return found rows for table-only permissions user with table visibility via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const getTableRows = await request(app.getHttpServer())
				.get(
					`/table/rows/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
				)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 200);
			const getTableRowsRO = JSON.parse(getTableRows.text);
			t.is(Object.hasOwn(getTableRowsRO, 'rows'), true);
			t.is(Object.hasOwn(getTableRowsRO, 'primaryColumns'), true);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should return added row for table-only permissions user with add=true via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const addRowInTable = await request(app.getHttpServer())
				.post(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
				)
				.send({
					[testData.firstTableInfo.testTableColumnName]: randomName,
					[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 201);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should throw an exception when table-only permissions user without edit tries to update row via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const updateRowInTable = await request(app.getHttpServer())
				.put(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=2`,
				)
				.send({
					[testData.firstTableInfo.testTableColumnName]: randomName,
					[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowInTable.status, 403);
			t.is(JSON.parse(updateRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should return delete result for table-only permissions user with delete=true via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const deleteRowInTable = await request(app.getHttpServer())
				.delete(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=19`,
				)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowInTable.status, 200);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

//****************************** CONNECTION:EDIT SCOPE — NO TABLE ACCESS ******************************

currentTest = 'GET /table/rows/:slug';

test.serial(
	`${currentTest} should return 403 for connection:edit user with no table permissions via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const getTableRows = await request(app.getHttpServer())
				.get(
					`/table/rows/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
				)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 403);
			t.is(JSON.parse(getTableRows.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should return 403 for connection:edit user with no table permissions via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const addRowInTable = await request(app.getHttpServer())
				.post(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}`,
				)
				.send({
					[testData.firstTableInfo.testTableColumnName]: randomName,
					[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 403);
			t.is(JSON.parse(addRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should return 403 for connection:edit user with no table permissions via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const updateRowInTable = await request(app.getHttpServer())
				.put(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=1`,
				)
				.send({
					[testData.firstTableInfo.testTableColumnName]: randomName,
					[testData.firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowInTable.status, 403);
			t.is(JSON.parse(updateRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should return 403 for connection:edit user with no table permissions via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const deleteRowInTable = await request(app.getHttpServer())
				.delete(
					`/table/row/${testData.connections.firstId}?tableName=${testData.firstTableInfo.testTableName}&id=19`,
				)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowInTable.status, 403);
			t.is(JSON.parse(deleteRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT /connection';

test.serial(
	`${currentTest} should return 200 for connection:edit user updating connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${testData.connections.firstId}`)
				.send(updateConnection)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateConnectionResponse.status, 200);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'GET /connection/one/:slug';

test.serial(
	`${currentTest} should return 200 for connection:edit user reading connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const findOneResponce = await request(app.getHttpServer())
				.get(`/connection/one/${testData.connections.firstId}`)
				.set('Content-Type', 'application/json')
				.set('Cookie', testData.users.simpleUserToken)
				.set('Accept', 'application/json');
			t.is(findOneResponce.status, 200);
			const result = findOneResponce.body.connection;
			t.is(Object.hasOwn(result, 'host'), true);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

//****************************** PERMISSION UPDATE CACHE INVALIDATION ******************************

test.serial(
	'Upgrading table permissions takes effect under Cedar (cache invalidation)',
	async (t) => {
		try {
			const connectionsId = { firstId: null, secondId: null, firstAdminGroupId: null };
			const connectionAdminUserInfo = await import('../../utils/register-user-and-return-user-info.js').then(
				(m) => m.registerUserAndReturnUserInfo(app),
			);
			const simpleUserRegisterInfo = await import('../../utils/register-user-and-return-user-info.js').then(
				(m) => m.inviteUserInCompanyAndAcceptInvitation(connectionAdminUserInfo.token, undefined, app, undefined),
			);
			const connectionAdminUserToken = connectionAdminUserInfo.token;
			const simpleUserToken = simpleUserRegisterInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const { createTestTable } = await import('../../utils/create-test-table.js');
			const firstTable = await createTestTable(newConnection);
			const newGroup1 = mockFactory.generateCreateGroupDto1();

			const createConnResp = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', connectionAdminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			connectionsId.firstId = JSON.parse(createConnResp.text).id;

			const createGroupResp = await request(app.getHttpServer())
				.post(`/connection/group/${connectionsId.firstId}`)
				.set('Cookie', connectionAdminUserToken)
				.send(newGroup1)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const groupId = JSON.parse(createGroupResp.text).id;

			// Set permissions with add=false
			const permissionsNoAdd = {
				connection: { connectionId: connectionsId.firstId, accessLevel: AccessLevelEnum.none },
				group: { groupId, accessLevel: AccessLevelEnum.none },
				tables: [
					{
						tableName: firstTable.testTableName,
						accessLevel: { visibility: true, readonly: false, add: false, delete: false, edit: false },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionsId.firstId}`)
				.send({ permissions: permissionsNoAdd })
				.set('Cookie', connectionAdminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Add user to group
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', connectionAdminUserToken)
				.send({ groupId, email: simpleUserRegisterInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Verify user gets 403 on POST row
			const addRowDenied = await request(app.getHttpServer())
				.post(`/table/row/${connectionsId.firstId}?tableName=${firstTable.testTableName}`)
				.send({
					[firstTable.testTableColumnName]: faker.person.firstName(),
					[firstTable.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowDenied.status, 403);

			// Upgrade permissions to add=true
			const permissionsWithAdd = {
				connection: { connectionId: connectionsId.firstId, accessLevel: AccessLevelEnum.none },
				group: { groupId, accessLevel: AccessLevelEnum.none },
				tables: [
					{
						tableName: firstTable.testTableName,
						accessLevel: { visibility: true, readonly: false, add: true, delete: false, edit: false },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionsId.firstId}`)
				.send({ permissions: permissionsWithAdd })
				.set('Cookie', connectionAdminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Verify user now gets 201 on POST row
			const addRowAllowed = await request(app.getHttpServer())
				.post(`/table/row/${connectionsId.firstId}?tableName=${firstTable.testTableName}`)
				.send({
					[firstTable.testTableColumnName]: faker.person.firstName(),
					[firstTable.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowAllowed.status, 201);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

test.serial(
	'Downgrading connection permissions takes effect under Cedar (cache invalidation)',
	async (t) => {
		try {
			const connectionAdminUserInfo = await import('../../utils/register-user-and-return-user-info.js').then(
				(m) => m.registerUserAndReturnUserInfo(app),
			);
			const simpleUserRegisterInfo = await import('../../utils/register-user-and-return-user-info.js').then(
				(m) => m.inviteUserInCompanyAndAcceptInvitation(connectionAdminUserInfo.token, undefined, app, undefined),
			);
			const connectionAdminUserToken = connectionAdminUserInfo.token;
			const simpleUserToken = simpleUserRegisterInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const newGroup1 = mockFactory.generateCreateGroupDto1();

			const createConnResp = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', connectionAdminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const connectionId = JSON.parse(createConnResp.text).id;

			const createGroupResp = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', connectionAdminUserToken)
				.send(newGroup1)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const groupId = JSON.parse(createGroupResp.text).id;

			// Set permissions with connection:edit
			const permissionsEdit = {
				connection: { connectionId, accessLevel: AccessLevelEnum.edit },
				group: { groupId, accessLevel: AccessLevelEnum.none },
				tables: [],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionId}`)
				.send({ permissions: permissionsEdit })
				.set('Cookie', connectionAdminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Add user to group
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', connectionAdminUserToken)
				.send({ groupId, email: simpleUserRegisterInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Verify user can PUT connection (200)
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateAllowed = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(updateConnection)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateAllowed.status, 200);

			// Downgrade to readonly
			const permissionsReadonly = {
				connection: { connectionId, accessLevel: AccessLevelEnum.readonly },
				group: { groupId, accessLevel: AccessLevelEnum.none },
				tables: [],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionId}`)
				.send({ permissions: permissionsReadonly })
				.set('Cookie', connectionAdminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Verify user gets 403 on PUT connection
			const updateDenied = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(updateConnection)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateDenied.status, 403);
			t.is(JSON.parse(updateDenied.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

//****************************** GROUP CREATION FLOW WITH CEDAR ******************************

test.serial(
	'Full group creation → permission assignment flow under Cedar',
	async (t) => {
		try {
			const connectionAdminUserInfo = await import('../../utils/register-user-and-return-user-info.js').then(
				(m) => m.registerUserAndReturnUserInfo(app),
			);
			const simpleUserRegisterInfo = await import('../../utils/register-user-and-return-user-info.js').then(
				(m) => m.inviteUserInCompanyAndAcceptInvitation(connectionAdminUserInfo.token, undefined, app, undefined),
			);
			const connectionAdminUserToken = connectionAdminUserInfo.token;
			const simpleUserToken = simpleUserRegisterInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const { createTestTable } = await import('../../utils/create-test-table.js');
			const firstTable = await createTestTable(newConnection);

			// 1. Create connection (admin group gets wildcard Cedar policy)
			const createConnResp = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', connectionAdminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnResp.status, 201);
			const connectionId = JSON.parse(createConnResp.text).id;

			// 2. Admin creates new group
			const newGroup1 = mockFactory.generateCreateGroupDto1();
			const createGroupResp = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', connectionAdminUserToken)
				.send(newGroup1)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createGroupResp.status, 201);
			const groupId = JSON.parse(createGroupResp.text).id;

			// 3. Verify admin can still access everything (new group's empty policy doesn't break combined set)
			const adminGetRows = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${firstTable.testTableName}`)
				.set('Cookie', connectionAdminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminGetRows.status, 200);

			// 4. Add user to new group (no permissions set yet)
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', connectionAdminUserToken)
				.send({ groupId, email: simpleUserRegisterInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// 5. Verify user gets 403 on all operations (no permissions)
			const userGetRows = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${firstTable.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(userGetRows.status, 403);

			const userAddRow = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${firstTable.testTableName}`)
				.send({
					[firstTable.testTableColumnName]: faker.person.firstName(),
					[firstTable.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(userAddRow.status, 403);

			const userUpdateConn = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(mockFactory.generateUpdateConnectionDto())
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(userUpdateConn.status, 403);

			// 6. Set permissions on the group
			const permissions = {
				connection: { connectionId, accessLevel: AccessLevelEnum.readonly },
				group: { groupId, accessLevel: AccessLevelEnum.none },
				tables: [
					{
						tableName: firstTable.testTableName,
						accessLevel: { visibility: true, readonly: false, add: true, delete: false, edit: false },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionId}`)
				.send({ permissions })
				.set('Cookie', connectionAdminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// 7. Verify user can now access resources per the new permissions
			const userGetRowsAfter = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${firstTable.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(userGetRowsAfter.status, 200);

			const userAddRowAfter = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${firstTable.testTableName}`)
				.send({
					[firstTable.testTableColumnName]: faker.person.firstName(),
					[firstTable.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(userAddRowAfter.status, 201);

			// connection:readonly means read works but edit fails
			const userGetConn = await request(app.getHttpServer())
				.get(`/connection/one/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(userGetConn.status, 200);

			const userUpdateConnAfter = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(mockFactory.generateUpdateConnectionDto())
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(userUpdateConnAfter.status, 403);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);
