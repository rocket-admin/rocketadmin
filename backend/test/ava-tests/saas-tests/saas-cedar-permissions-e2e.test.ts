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
import { TestUtils } from '../../utils/test.utils.js';
import {
	createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions,
	createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection,
	createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions,
	createConnectionAndInviteUserWithConnectionEditOnly,
	createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions,
} from '../../utils/user-with-different-permissions-utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

const mockFactory = new MockFactory();
const newConnectionToPostgres = mockFactory.generateConnectionToTestPostgresDBInDocker();
const updateConnection = mockFactory.generateUpdateConnectionDto();

test.before(async () => {
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

//****************************** DEFAULT PERMISSIONS: connection=readonly, group=readonly ******************************
//****************************** table: visibility=true, readonly=false, add=true, delete=true, edit=false ******************************

currentTest = 'GET /connections/';

test.serial(
	`${currentTest} should return connections with readonly access for user in readonly group via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				firstTableInfo,
				groups,
				permissions,
				secondTableInfo,
				users: { adminUserToken, simpleUserToken },
			} = testData;
			const findAll = await request(app.getHttpServer())
				.get('/connections')
				.set('Content-Type', 'application/json')
				.set('Cookie', simpleUserToken)
				.set('Accept', 'application/json');

			t.is(findAll.status, 200);

			const result = findAll.body.connections;
			const targetConnection = result.find(
				({ connection }: any) => connection.id === connections.firstId,
			);
			t.is(Object.hasOwn(targetConnection, 'connection'), true);
			t.is(Object.hasOwn(targetConnection, 'accessLevel'), true);
			t.is(targetConnection.accessLevel, AccessLevelEnum.readonly);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'GET /connection/one/:slug';

test.serial(`${currentTest} should return a found connection for readonly group user via Cedar`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const {
			connections,
			users: { simpleUserToken },
		} = testData;

		const findOneResponce = await request(app.getHttpServer())
			.get(`/connection/one/${connections.firstId}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', simpleUserToken)
			.set('Accept', 'application/json');
		t.is(findOneResponce.status, 200);

		const result = findOneResponce.body.connection;
		t.is(result.type, 'postgres');
		t.is(Object.hasOwn(result, 'host'), true);
		t.is(typeof result.port, 'number');
		t.is(Object.hasOwn(result, 'createdAt'), true);
		t.is(Object.hasOwn(result, 'updatedAt'), true);
		t.is(Object.hasOwn(result, 'password'), false);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(
	`${currentTest} should return limited connection info when user has no permission on second connection via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const findOneResponce = await request(app.getHttpServer())
				.get(`/connection/one/${connections.secondId}`)
				.set('Content-Type', 'application/json')
				.set('Cookie', simpleUserToken)
				.set('Accept', 'application/json');
			t.is(findOneResponce.status, 200);
			const findOneRO = JSON.parse(findOneResponce.text);
			t.is(Object.hasOwn(findOneRO, 'host'), false);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'PUT /connection';

test.serial(
	`${currentTest} should throw exception when readonly user tries to update connection via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${connections.firstId}`)
				.send(updateConnection)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(updateConnectionResponse.status, 403);
			t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'DELETE /connection/:slug';

test.serial(
	`${currentTest} should throw exception when readonly user tries to delete connection via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const response = await request(app.getHttpServer())
				.put(`/connection/delete/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(response.status, 403);
			t.is(JSON.parse(response.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'POST /connection/group/:slug';

test.serial(
	`${currentTest} should throw exception when readonly group user tries to create group via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;
			const newGroup1 = mockFactory.generateCreateGroupDto1();

			const createGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.send(newGroup1)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(createGroupResponse.status, 403);
			t.is(JSON.parse(createGroupResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'GET /connection/groups/:slug';

test.serial(`${currentTest} should return groups for readonly group user via Cedar`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const {
			connections,
			users: { simpleUserToken },
		} = testData;

		const response = await request(app.getHttpServer())
			.get(`/connection/groups/${connections.firstId}`)
			.set('Cookie', simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(response.status, 200);
		const result = JSON.parse(response.text);
		t.is(result.length > 0, true);
		t.is(result[0].accessLevel, AccessLevelEnum.readonly);

		const adminGroupIndex = result.findIndex((el: any) => el.group.title === 'Admin');
		t.is(adminGroupIndex >= 0, false);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

currentTest = 'GET /connection/tables/:slug';

test.serial(`${currentTest} should return all tables for readonly group user via Cedar`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const {
			connections,
			firstTableInfo,
			users: { simpleUserToken },
		} = testData;

		const getTablesInConnection = await request(app.getHttpServer())
			.get(`/connection/tables/${connections.firstId}`)
			.set('Cookie', simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(getTablesInConnection.status, 200);
		const getTablesInConnectionRO = JSON.parse(getTablesInConnection.text);
		t.is(getTablesInConnectionRO.length > 0, true);
		const tableIndex = getTablesInConnectionRO.findIndex(
			(table: any) => table.table === firstTableInfo.testTableName,
		);
		t.is(typeof getTablesInConnectionRO[tableIndex].permissions, 'object');
	} catch (e) {
		console.error(e);
		throw e;
	}
});

currentTest = 'GET /table/rows/:slug';

test.serial(`${currentTest} should return found rows for readonly group user via Cedar`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const {
			connections,
			firstTableInfo,
			users: { simpleUserToken },
		} = testData;

		const getTableRows = await request(app.getHttpServer())
			.get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
			.set('Cookie', simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(getTableRows.status, 200);
		const getTableRowsRO = JSON.parse(getTableRows.text);
		const { rows, primaryColumns, pagination, structure, foreignKeys } = getTableRowsRO;
		t.is(rows.length, Constants.DEFAULT_PAGINATION.perPage);
		t.is(primaryColumns.length, 1);
		t.is(structure.length, 5);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should return added row for user with add=true permission via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const addRowInTable = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 201);
			const addRowInTableRO = JSON.parse(addRowInTable.text);
			t.is(Object.hasOwn(addRowInTableRO.row, 'id'), true);
			t.is(addRowInTableRO.row[firstTableInfo.testTableColumnName], randomName);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when user with edit=false tries to update row via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const updateRowInTable = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					name: randomName,
					email: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowInTable.status, 403);
			t.is(JSON.parse(updateRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should return delete result for user with delete=true permission via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const deleteRowInTable = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=19`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowInTable.status, 200);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** CUSTOM TABLE PERMISSIONS: add=false ******************************

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when user with add=false tries to add row via Cedar`,
	async (t) => {
		try {
			const permissionNoAdd = {
				visibility: true,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNoAdd,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const addRowInTable = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** CUSTOM TABLE PERMISSIONS: edit=true ******************************

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should return updated row for user with edit=true permission via Cedar`,
	async (t) => {
		try {
			const permissionWithEdit = {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionWithEdit,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const updateRowInTable = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowInTable.status, 200);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** CUSTOM TABLE PERMISSIONS: delete=false ******************************

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when user with delete=false tries to delete row via Cedar`,
	async (t) => {
		try {
			const permissionNoDelete = {
				visibility: true,
				readonly: false,
				add: true,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNoDelete,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const deleteRowInTable = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=19`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowInTable.status, 403);
			t.is(JSON.parse(deleteRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** CUSTOM TABLE PERMISSIONS: visibility=false ******************************

currentTest = 'GET /table/rows/:slug';

test.serial(
	`${currentTest} should throw exception when user with visibility=false tries to read table rows via Cedar`,
	async (t) => {
		try {
			const permissionNoVisibility = {
				visibility: false,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNoVisibility,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 403);
			t.is(JSON.parse(getTableRows.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** CUSTOM TABLE PERMISSIONS: all=true (full table access) ******************************

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should return added row for user with all table permissions true via Cedar`,
	async (t) => {
		try {
			const permissionAll = {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionAll,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const addRowInTable = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 201);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should return updated row for user with all table permissions true via Cedar`,
	async (t) => {
		try {
			const permissionAll = {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionAll,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const updateRowInTable = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowInTable.status, 200);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should return delete result for user with all table permissions true via Cedar`,
	async (t) => {
		try {
			const permissionAll = {
				visibility: true,
				readonly: false,
				add: true,
				delete: true,
				edit: true,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionAll,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const deleteRowInTable = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=19`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowInTable.status, 200);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** CUSTOM TABLE PERMISSIONS: all=false (no table access) ******************************

currentTest = 'GET /table/rows/:slug';

test.serial(
	`${currentTest} should throw exception when user with all table permissions false tries to read rows via Cedar`,
	async (t) => {
		try {
			const permissionNone = {
				visibility: false,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNone,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 403);
			t.is(JSON.parse(getTableRows.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when user with all table permissions false tries to add row via Cedar`,
	async (t) => {
		try {
			const permissionNone = {
				visibility: false,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNone,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const addRowInTable = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when user with all table permissions false tries to update row via Cedar`,
	async (t) => {
		try {
			const permissionNone = {
				visibility: false,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNone,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const updateRowInTable = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowInTable.status, 403);
			t.is(JSON.parse(updateRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when user with all table permissions false tries to delete row via Cedar`,
	async (t) => {
		try {
			const permissionNone = {
				visibility: false,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNone,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const deleteRowInTable = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=19`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowInTable.status, 403);
			t.is(JSON.parse(deleteRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** FAKE CONNECTION/TABLE - AUTHORIZATION EDGE CASES ******************************

currentTest = 'GET /table/rows/:slug';

test.serial(
	`${currentTest} should throw exception when connection id is fake via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;
			const fakeId = faker.string.uuid();
			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${fakeId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 403);
			t.is(JSON.parse(getTableRows.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} should throw exception when table name is fake via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;
			const fakeTableName = `${faker.lorem.words(1)}_${faker.string.uuid()}`;
			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connections.firstId}?tableName=${fakeTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 403);
			t.is(JSON.parse(getTableRows.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'POST /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when connection id is fake via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;
			const fakeConnectionId = faker.string.uuid();
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const addRowInTable = await request(app.getHttpServer())
				.post(`/table/row/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: randomName,
					[firstTableInfo.testTableSecondColumnName]: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 403);
			t.is(JSON.parse(addRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'PUT /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when connection id is fake via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;
			const fakeConnectionId = faker.string.uuid();
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const created_at = new Date();
			const updated_at = new Date();
			const updateRowInTable = await request(app.getHttpServer())
				.put(`/table/row/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}&id=1`)
				.send({
					name: randomName,
					email: randomEmail,
					created_at: created_at,
					updated_at: updated_at,
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(JSON.parse(updateRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

currentTest = 'DELETE /table/row/:slug';

test.serial(
	`${currentTest} should throw exception when connection id is fake via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;
			const fakeConnectionId = faker.string.uuid();
			const deleteRowInTable = await request(app.getHttpServer())
				.delete(`/table/row/${fakeConnectionId}?tableName=${firstTableInfo.testTableName}&id=1`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(JSON.parse(deleteRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
			t.is(deleteRowInTable.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: Cross-connection isolation ******************************

currentTest = 'CROSS-CONNECTION ISOLATION';

test.serial(
	`${currentTest} should deny access when user tries to read tables from a connection they are NOT in via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				secondTableInfo,
				users: { simpleUserToken },
			} = testData;

			// User is only in first connection's group, NOT in second connection
			// TablesReceiveGuard returns 400 CONNECTION_NOT_FOUND when user is not from connection
			const getTablesInSecondConnection = await request(app.getHttpServer())
				.get(`/connection/tables/${connections.secondId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesInSecondConnection.status, 400);
			t.is(JSON.parse(getTablesInSecondConnection.text).message, Messages.CONNECTION_NOT_FOUND);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} should deny row access on second connection even with valid table name via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			// Try to read rows from first connection's table name but using second connection's ID
			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connections.secondId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 403);
			t.is(JSON.parse(getTableRows.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} should deny adding rows to second connection that user has no access to via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const addRowInTable = await request(app.getHttpServer())
				.post(`/table/row/${connections.secondId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 403);
			t.is(JSON.parse(addRowInTable.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: Admin group (isMain=true) hierarchy ******************************

currentTest = 'ADMIN GROUP HIERARCHY';

test.serial(
	`${currentTest} admin group user should have full connection edit access via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const findAll = await request(app.getHttpServer())
				.get('/connections')
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(findAll.status, 200);
			const result = findAll.body.connections;
			const targetConnection = result.find(({ connection }: any) => connection.id === connections.firstId);
			t.truthy(targetConnection);
			t.is(targetConnection.accessLevel, AccessLevelEnum.edit);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} admin group user should be able to create groups via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const newGroup = mockFactory.generateCreateGroupDto1();
			const createGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.send(newGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createGroupResponse.status, 201);
			t.truthy(JSON.parse(createGroupResponse.text).id);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} admin group user should have full table CRUD access via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			// Read rows
			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 200);

			// Add row
			const addRowInTable = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowInTable.status, 201);

			// Edit row
			const updateRow = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRow.status, 200);

			// Delete row
			const deleteRow = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=19`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRow.status, 200);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} admin group user should NOT have access to second connection they are NOT in via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			// Admin in first connection should NOT see second connection's tables
			// TablesReceiveGuard returns 400 CONNECTION_NOT_FOUND when user is not from connection
			const getTablesInSecondConnection = await request(app.getHttpServer())
				.get(`/connection/tables/${connections.secondId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesInSecondConnection.status, 400);
			t.is(JSON.parse(getTablesInSecondConnection.text).message, Messages.CONNECTION_NOT_FOUND);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: Table-only permissions (no connection/group access) ******************************

currentTest = 'TABLE-ONLY PERMISSIONS';

test.serial(
	`${currentTest} user with only table permissions should be able to read table rows via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 200);
			const result = JSON.parse(getTableRows.text);
			t.truthy(result.rows);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} user with only table permissions should get none access level for connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const findOneResponse = await request(app.getHttpServer())
				.get(`/connection/one/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(findOneResponse.status, 200);
			const findOneRO = JSON.parse(findOneResponse.text);
			t.is(findOneRO.accessLevel, AccessLevelEnum.none);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} user with only table permissions should NOT be able to update connection via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithOnlyTablePermissions(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${connections.firstId}`)
				.send(updateConnection)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateConnectionResponse.status, 403);
			t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: connection:edit with no table permissions ******************************

currentTest = 'CONNECTION EDIT NO TABLES';

test.serial(
	`${currentTest} user with connection:edit but no table perms should get edit access level via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const findAll = await request(app.getHttpServer())
				.get('/connections')
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(findAll.status, 200);
			const result = findAll.body.connections;
			const targetConnection = result.find(({ connection }: any) => connection.id === connections.firstId);
			t.truthy(targetConnection);
			t.is(targetConnection.accessLevel, AccessLevelEnum.edit);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} user with connection:edit should be able to create groups via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const newGroup = mockFactory.generateCreateGroupDto1();
			const createGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.send(newGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createGroupResponse.status, 201);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} user with connection:edit should see all tables with full permissions via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const getTablesInConnection = await request(app.getHttpServer())
				.get(`/connection/tables/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesInConnection.status, 200);
			const tables = JSON.parse(getTablesInConnection.text);
			t.true(tables.length > 0);
			const targetTable = tables.find((table: any) => table.table === firstTableInfo.testTableName);
			t.truthy(targetTable);
			t.is(targetTable.permissions.visibility, true);
			t.is(targetTable.permissions.add, true);
			t.is(targetTable.permissions.edit, true);
			t.is(targetTable.permissions.delete, true);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: Group permissions hierarchy ******************************

currentTest = 'GROUP PERMISSION HIERARCHY';

test.serial(
	`${currentTest} user with group:edit should be able to see groups with edit access level via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const {
				connections,
				groups,
				users: { simpleUserToken },
			} = testData;

			const response = await request(app.getHttpServer())
				.get(`/connection/groups/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(response.status, 200);
			const result = JSON.parse(response.text);
			t.true(result.length > 0);

			const createdGroup = result.find((el: any) => el.group.id === groups.createdGroupId);
			t.truthy(createdGroup);
			t.is(createdGroup.accessLevel, AccessLevelEnum.edit);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} readonly group user should see groups with readonly access level via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
				);
			const {
				connections,
				groups,
				users: { simpleUserToken },
			} = testData;

			const response = await request(app.getHttpServer())
				.get(`/connection/groups/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(response.status, 200);
			const result = JSON.parse(response.text);
			const createdGroup = result.find((el: any) => el.group.id === groups.createdGroupId);
			t.truthy(createdGroup);
			t.is(createdGroup.accessLevel, AccessLevelEnum.readonly);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: Table permissions returned from API match Cedar policy ******************************

currentTest = 'TABLE PERMISSIONS ACCURACY';

test.serial(
	`${currentTest} getUserTablePermissions should return exact table permissions matching Cedar policy via Cedar`,
	async (t) => {
		try {
			const permissionMixed = {
				visibility: true,
				readonly: false,
				add: true,
				delete: false,
				edit: true,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionMixed,
				);
			const {
				connections,
				firstTableInfo,
				groups,
				users: { simpleUserToken },
			} = testData;

			// Check permissions returned from connection/permissions endpoint
			const response = await request(app.getHttpServer())
				.get(`/connection/permissions?connectionId=${connections.firstId}&groupId=${groups.createdGroupId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(response.status, 200);

			const result = JSON.parse(response.text);
			const tablePermission = result.tables.find((t: any) => t.tableName === firstTableInfo.testTableName);
			t.truthy(tablePermission);
			t.is(tablePermission.accessLevel.visibility, true);
			t.is(tablePermission.accessLevel.add, true);
			t.is(tablePermission.accessLevel.delete, false);
			t.is(tablePermission.accessLevel.edit, true);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} table list should only show tables with visibility=true via Cedar`,
	async (t) => {
		try {
			const permissionNoVisibility = {
				visibility: false,
				readonly: false,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionNoVisibility,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			const getTablesInConnection = await request(app.getHttpServer())
				.get(`/connection/tables/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesInConnection.status, 200);
			const tables = JSON.parse(getTablesInConnection.text);
			// The table with visibility=false should NOT appear in the list
			const hiddenTable = tables.find((table: any) => table.table === firstTableInfo.testTableName);
			t.is(hiddenTable, undefined);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: Per-action granularity ******************************

currentTest = 'PER-ACTION GRANULARITY';

test.serial(
	`${currentTest} user with only add permission should be able to add but not edit or delete via Cedar`,
	async (t) => {
		try {
			const permissionAddOnly = {
				visibility: true,
				readonly: false,
				add: true,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionAddOnly,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			// Can add
			const addRow = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRow.status, 201);

			// Cannot edit
			const editRow = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(editRow.status, 403);

			// Cannot delete
			const deleteRow = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=18`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRow.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} user with only edit permission should be able to edit but not add or delete via Cedar`,
	async (t) => {
		try {
			const permissionEditOnly = {
				visibility: true,
				readonly: false,
				add: false,
				delete: false,
				edit: true,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionEditOnly,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			// Cannot add
			const addRow = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRow.status, 403);

			// Can edit
			const editRow = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(editRow.status, 200);

			// Cannot delete
			const deleteRow = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=18`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRow.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} user with only delete permission should be able to delete but not add or edit via Cedar`,
	async (t) => {
		try {
			const permissionDeleteOnly = {
				visibility: true,
				readonly: false,
				add: false,
				delete: true,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionDeleteOnly,
				);
			const {
				connections,
				firstTableInfo,
				users: { simpleUserToken },
			} = testData;

			// Cannot add
			const addRow = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRow.status, 403);

			// Cannot edit
			const editRow = await request(app.getHttpServer())
				.put(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=2`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(editRow.status, 403);

			// Can delete
			const deleteRow = await request(app.getHttpServer())
				.delete(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}&id=17`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRow.status, 200);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

//****************************** DEEP PERMISSIONS: Admin vs non-admin user asymmetry ******************************

currentTest = 'ADMIN VS NON-ADMIN ASYMMETRY';

test.serial(
	`${currentTest} admin should have full access while non-admin has restricted access on same connection via Cedar`,
	async (t) => {
		try {
			const permissionReadOnly = {
				visibility: true,
				readonly: true,
				add: false,
				delete: false,
				edit: false,
			};
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(
					app,
					permissionReadOnly,
				);
			const {
				connections,
				firstTableInfo,
				users: { adminUserToken, simpleUserToken },
			} = testData;

			// Both can read rows
			const adminRead = await request(app.getHttpServer())
				.get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminRead.status, 200);

			const simpleRead = await request(app.getHttpServer())
				.get(`/table/rows/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(simpleRead.status, 200);

			// Admin can add rows
			const adminAdd = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminAdd.status, 201);

			// Non-admin cannot add rows
			const simpleAdd = await request(app.getHttpServer())
				.post(`/table/row/${connections.firstId}?tableName=${firstTableInfo.testTableName}`)
				.send({
					[firstTableInfo.testTableColumnName]: faker.person.firstName(),
					[firstTableInfo.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(simpleAdd.status, 403);

			// Non-admin cannot update connection
			const simpleUpdate = await request(app.getHttpServer())
				.put(`/connection/${connections.firstId}`)
				.send(updateConnection)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(simpleUpdate.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);
