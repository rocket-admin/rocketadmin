/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable security/detect-object-injection */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ApplicationModule } from '../../../src/app.module.js';
import { BaseType } from '../../../src/common/data-injection.tokens.js';
import { migratePermissionsToCedar } from '../../../src/entities/cedar-authorization/scripts/migrate-permissions-to-cedar.js';
import { GroupEntity } from '../../../src/entities/group/group.entity.js';
import { PermissionEntity } from '../../../src/entities/permission/permission.entity.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { UserEntity } from '../../../src/entities/user/user.entity.js';
import { CompanyInfoEntity } from '../../../src/entities/company-info/company-info.entity.js';
import { ConnectionEntity } from '../../../src/entities/connection/connection.entity.js';
import { UserRoleEnum } from '../../../src/entities/user/enums/user-role.enum.js';
import { generateGwtToken } from '../../../src/entities/user/utils/generate-gwt-token.js';
import { buildDefaultAdminGroups } from '../../../src/entities/user/utils/build-default-admin-groups.js';
import { generateCedarPolicyForGroup } from '../../../src/entities/cedar-authorization/cedar-policy-generator.js';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../src/enums/index.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import { createTestTable } from '../../utils/create-test-table.js';
import {
	inviteUserInCompanyAndAcceptInvitation,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

const mockFactory = new MockFactory();

test.before(async () => {
	// Start WITHOUT Cedar enabled - simulating the old permission system
	delete process.env.CEDAR_AUTHORIZATION_ENABLED;
	setSaasEnvVariable(true);
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
		setSaasEnvVariable(false);
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

//****************************** CEDAR MIGRATION: existing SaaS users retain permissions after migration ******************************

currentTest = 'Cedar migration SaaS - admin user';

test.serial(
	`${currentTest} should retain full access for admin user (isMain group) after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Create user and connection WITHOUT Cedar
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const testTable = await createTestTable(newConnection);

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnectionResponse.status, 201);
			const connectionId = JSON.parse(createConnectionResponse.text).id;

			// Step 2: Verify classical permissions work
			const getTablesBeforeMigration = await request(app.getHttpServer())
				.get(`/connection/tables/${connectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesBeforeMigration.status, 200);

			// Step 3: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 4: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 5: Verify admin user still has full access via Cedar
			const getTablesAfterMigration = await request(app.getHttpServer())
				.get(`/connection/tables/${connectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesAfterMigration.status, 200);

			// Verify admin can read table rows
			const getTableRows = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${testTable.testTableName}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTableRows.status, 200);

			// Verify admin can add rows
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${testTable.testTableName}`)
				.send({
					[testTable.testTableColumnName]: randomName,
					[testTable.testTableSecondColumnName]: randomEmail,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowResponse.status, 201);

			// Verify admin can update connection
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(updateConnection)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateConnectionResponse.status, 200);

			// Verify admin can read groups
			const getGroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${connectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getGroupsResponse.status, 200);
			const groups = JSON.parse(getGroupsResponse.text);
			t.is(groups.length > 0, true);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

currentTest = 'Cedar migration SaaS - non-admin user with readonly permissions';

test.serial(
	`${currentTest} should retain readonly access for non-admin user after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const simpleUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const simpleUserToken = simpleUserInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const testTable = await createTestTable(newConnection);

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnectionResponse.status, 201);
			const connectionId = JSON.parse(createConnectionResponse.text).id;

			// Create a non-admin group
			const newGroup = mockFactory.generateCreateGroupDto1();
			const createGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', adminUserToken)
				.send(newGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createGroupResponse.status, 201);
			const groupId = JSON.parse(createGroupResponse.text).id;

			// Set readonly permissions via classical system
			const permissions = {
				connection: {
					connectionId: connectionId,
					accessLevel: AccessLevelEnum.readonly,
				},
				group: {
					groupId: groupId,
					accessLevel: AccessLevelEnum.readonly,
				},
				tables: [
					{
						tableName: testTable.testTableName,
						accessLevel: {
							visibility: true,
							readonly: true,
							add: false,
							delete: false,
							edit: false,
						},
					},
				],
			};

			const setPermissionsResponse = await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionId}`)
				.send({ permissions })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(setPermissionsResponse.status, 200);

			// Add user to group
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId, email: simpleUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Verify classical permissions work
			const getTablesBeforeMigration = await request(app.getHttpServer())
				.get(`/connection/tables/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesBeforeMigration.status, 200);

			const getRowsBeforeMigration = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${testTable.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getRowsBeforeMigration.status, 200);

			// Step 3: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 4: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 5: Verify user retains readonly access via Cedar
			const getConnectionsAfterMigration = await request(app.getHttpServer())
				.get('/connections')
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getConnectionsAfterMigration.status, 200);
			const connections = getConnectionsAfterMigration.body.connections;
			const targetConnection = connections.find(
				({ connection }: any) => connection.id === connectionId,
			);
			t.is(targetConnection.accessLevel, AccessLevelEnum.readonly);

			const getTablesAfterMigration = await request(app.getHttpServer())
				.get(`/connection/tables/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesAfterMigration.status, 200);

			const getRowsAfterMigration = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${testTable.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getRowsAfterMigration.status, 200);

			// Verify readonly user still CANNOT update connection
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(updateConnection)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateConnectionResponse.status, 403);

			// Verify readonly user still CANNOT add rows
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${testTable.testTableName}`)
				.send({
					[testTable.testTableColumnName]: randomName,
					[testTable.testTableSecondColumnName]: randomEmail,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowResponse.status, 403);

			// Verify readonly user still CANNOT delete rows
			const deleteRowResponse = await request(app.getHttpServer())
				.delete(`/table/row/${connectionId}?tableName=${testTable.testTableName}&id=1`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowResponse.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

currentTest = 'Cedar migration SaaS - non-admin user with edit permissions';

test.serial(
	`${currentTest} should retain table edit permissions for non-admin user after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const simpleUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const simpleUserToken = simpleUserInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const testTable = await createTestTable(newConnection);

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnectionResponse.status, 201);
			const connectionId = JSON.parse(createConnectionResponse.text).id;

			// Create a non-admin group with full table edit permissions
			const newGroup = mockFactory.generateCreateGroupDto1();
			const createGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', adminUserToken)
				.send(newGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createGroupResponse.status, 201);
			const groupId = JSON.parse(createGroupResponse.text).id;

			// Set edit permissions
			const permissions = {
				connection: {
					connectionId: connectionId,
					accessLevel: AccessLevelEnum.readonly,
				},
				group: {
					groupId: groupId,
					accessLevel: AccessLevelEnum.readonly,
				},
				tables: [
					{
						tableName: testTable.testTableName,
						accessLevel: {
							visibility: true,
							readonly: false,
							add: true,
							delete: true,
							edit: true,
						},
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionId}`)
				.send({ permissions })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Add user to group
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId, email: simpleUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Verify classical permissions work - user can add rows
			const randomName1 = faker.person.firstName();
			const randomEmail1 = faker.internet.email();
			const addRowBeforeMigration = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${testTable.testTableName}`)
				.send({
					[testTable.testTableColumnName]: randomName1,
					[testTable.testTableSecondColumnName]: randomEmail1,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowBeforeMigration.status, 201);

			// Step 3: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 4: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 5: Verify all table operations work via Cedar

			// Can read table rows
			const getRowsAfterMigration = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${testTable.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getRowsAfterMigration.status, 200);

			// Can add rows
			const randomName2 = faker.person.firstName();
			const randomEmail2 = faker.internet.email();
			const addRowAfterMigration = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${testTable.testTableName}`)
				.send({
					[testTable.testTableColumnName]: randomName2,
					[testTable.testTableSecondColumnName]: randomEmail2,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowAfterMigration.status, 201);
			const addedRowId = JSON.parse(addRowAfterMigration.text).row.id;

			// Can update rows
			const randomName3 = faker.person.firstName();
			const randomEmail3 = faker.internet.email();
			const updateRowAfterMigration = await request(app.getHttpServer())
				.put(`/table/row/${connectionId}?tableName=${testTable.testTableName}&id=${addedRowId}`)
				.send({
					[testTable.testTableColumnName]: randomName3,
					[testTable.testTableSecondColumnName]: randomEmail3,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateRowAfterMigration.status, 200);

			// Can delete rows
			const deleteRowAfterMigration = await request(app.getHttpServer())
				.delete(`/table/row/${connectionId}?tableName=${testTable.testTableName}&id=${addedRowId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(deleteRowAfterMigration.status, 200);

			// Verify connection is still readonly (cannot update connection)
			const updateConnection = mockFactory.generateUpdateConnectionDto();
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(updateConnection)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(updateConnectionResponse.status, 403);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

currentTest = 'Cedar migration SaaS - user added to admin group of existing connection';

test.serial(
	`${currentTest} should retain admin access for user added to admin group after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const simpleUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const simpleUserToken = simpleUserInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const testTable = await createTestTable(newConnection);

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnectionResponse.status, 201);
			const connectionId = JSON.parse(createConnectionResponse.text).id;

			// Get admin group (isMain=true)
			const getGroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${connectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const groups = JSON.parse(getGroupsResponse.text);
			const adminGroupId = groups[0].group.id;

			// Add user to admin group
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: adminGroupId, email: simpleUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Verify user has admin access via classical permissions
			const getTablesBeforeMigration = await request(app.getHttpServer())
				.get(`/connection/tables/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesBeforeMigration.status, 200);

			// Step 3: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 4: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 5: Verify admin group member retains full access via Cedar

			// Can read tables
			const getTablesAfterMigration = await request(app.getHttpServer())
				.get(`/connection/tables/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getTablesAfterMigration.status, 200);

			// Can read table rows
			const getRowsAfterMigration = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${testTable.testTableName}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getRowsAfterMigration.status, 200);

			// Can add rows
			const randomName = faker.person.firstName();
			const randomEmail = faker.internet.email();
			const addRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${testTable.testTableName}`)
				.send({
					[testTable.testTableColumnName]: randomName,
					[testTable.testTableSecondColumnName]: randomEmail,
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(addRowResponse.status, 201);

			// Can create new group (admin privilege)
			const newGroup = mockFactory.generateCreateGroupDto1();
			const createGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.send(newGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createGroupResponse.status, 201);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

currentTest = 'Cedar migration SaaS - multiple users with different permission levels';

test.serial(
	`${currentTest} should retain correct permissions for multiple users after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const readonlyUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const readonlyUserToken = readonlyUserInfo.token;

			const editUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const editUserToken = editUserInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const testTable = await createTestTable(newConnection);

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnectionResponse.status, 201);
			const connectionId = JSON.parse(createConnectionResponse.text).id;

			// Create readonly group
			const readonlyGroup = mockFactory.generateCreateGroupDto1();
			const createReadonlyGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', adminUserToken)
				.send(readonlyGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const readonlyGroupId = JSON.parse(createReadonlyGroupResponse.text).id;

			const readonlyPermissions = {
				connection: {
					connectionId: connectionId,
					accessLevel: AccessLevelEnum.readonly,
				},
				group: {
					groupId: readonlyGroupId,
					accessLevel: AccessLevelEnum.readonly,
				},
				tables: [
					{
						tableName: testTable.testTableName,
						accessLevel: {
							visibility: true,
							readonly: true,
							add: false,
							delete: false,
							edit: false,
						},
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${readonlyGroupId}?connectionId=${connectionId}`)
				.send({ permissions: readonlyPermissions })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: readonlyGroupId, email: readonlyUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Create edit group
			const editGroup = { title: `edit_group_${faker.string.uuid()}` };
			const createEditGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', adminUserToken)
				.send(editGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const editGroupId = JSON.parse(createEditGroupResponse.text).id;

			const editPermissions = {
				connection: {
					connectionId: connectionId,
					accessLevel: AccessLevelEnum.readonly,
				},
				group: {
					groupId: editGroupId,
					accessLevel: AccessLevelEnum.readonly,
				},
				tables: [
					{
						tableName: testTable.testTableName,
						accessLevel: {
							visibility: true,
							readonly: false,
							add: true,
							delete: true,
							edit: true,
						},
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${editGroupId}?connectionId=${connectionId}`)
				.send({ permissions: editPermissions })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: editGroupId, email: editUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 3: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 4: Verify readonly user permissions
			const readonlyGetRows = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${testTable.testTableName}`)
				.set('Cookie', readonlyUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(readonlyGetRows.status, 200);

			// Readonly user CANNOT add
			const readonlyAddRow = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${testTable.testTableName}`)
				.send({
					[testTable.testTableColumnName]: faker.person.firstName(),
					[testTable.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', readonlyUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(readonlyAddRow.status, 403);

			// Step 5: Verify edit user permissions
			const editGetRows = await request(app.getHttpServer())
				.get(`/table/rows/${connectionId}?tableName=${testTable.testTableName}`)
				.set('Cookie', editUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(editGetRows.status, 200);

			// Edit user CAN add
			const editAddRow = await request(app.getHttpServer())
				.post(`/table/row/${connectionId}?tableName=${testTable.testTableName}`)
				.send({
					[testTable.testTableColumnName]: faker.person.firstName(),
					[testTable.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', editUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(editAddRow.status, 201);

			// Edit user CAN delete
			const addedRowId = JSON.parse(editAddRow.text).row.id;
			const editDeleteRow = await request(app.getHttpServer())
				.delete(`/table/row/${connectionId}?tableName=${testTable.testTableName}&id=${addedRowId}`)
				.set('Cookie', editUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(editDeleteRow.status, 200);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

//****************************** CEDAR MIGRATION: connections and groups listing ******************************

currentTest = 'Cedar migration SaaS - GET /connections';

test.serial(
	`${currentTest} should return all user connections with correct access levels after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar - create two connections
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const simpleUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const simpleUserToken = simpleUserInfo.token;

			const newConnection1 = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const newConnection2 = mockFactory.generateConnectionToTestMySQLDBInDocker();
			const testTable1 = await createTestTable(newConnection1);
			const testTable2 = await createTestTable(newConnection2);

			const createConn1Response = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection1)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConn1Response.status, 201);
			const connectionId1 = JSON.parse(createConn1Response.text).id;

			const createConn2Response = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection2)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConn2Response.status, 201);
			const connectionId2 = JSON.parse(createConn2Response.text).id;

			// Create group with readonly permissions on connection 1
			const newGroup1 = mockFactory.generateCreateGroupDto1();
			const createGroup1Response = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId1}`)
				.set('Cookie', adminUserToken)
				.send(newGroup1)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const groupId1 = JSON.parse(createGroup1Response.text).id;

			const permissions1 = {
				connection: { connectionId: connectionId1, accessLevel: AccessLevelEnum.readonly },
				group: { groupId: groupId1, accessLevel: AccessLevelEnum.readonly },
				tables: [
					{
						tableName: testTable1.testTableName,
						accessLevel: { visibility: true, readonly: true, add: false, delete: false, edit: false },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId1}?connectionId=${connectionId1}`)
				.send({ permissions: permissions1 })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: groupId1, email: simpleUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Create group with edit permissions on connection 2
			const newGroup2 = { title: `group2_${faker.string.uuid()}` };
			const createGroup2Response = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId2}`)
				.set('Cookie', adminUserToken)
				.send(newGroup2)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const groupId2 = JSON.parse(createGroup2Response.text).id;

			const permissions2 = {
				connection: { connectionId: connectionId2, accessLevel: AccessLevelEnum.edit },
				group: { groupId: groupId2, accessLevel: AccessLevelEnum.readonly },
				tables: [
					{
						tableName: testTable2.testTableName,
						accessLevel: { visibility: true, readonly: false, add: true, delete: true, edit: true },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId2}?connectionId=${connectionId2}`)
				.send({ permissions: permissions2 })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: groupId2, email: simpleUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 3: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 4: Verify GET /connections returns both connections with correct access levels
			const getConnectionsResponse = await request(app.getHttpServer())
				.get('/connections')
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(getConnectionsResponse.status, 200);

			const connections = getConnectionsResponse.body.connections;
			const conn1 = connections.find(({ connection }: any) => connection.id === connectionId1);
			const conn2 = connections.find(({ connection }: any) => connection.id === connectionId2);

			t.truthy(conn1, 'Connection 1 should be present in the list');
			t.is(conn1.accessLevel, AccessLevelEnum.readonly);

			t.truthy(conn2, 'Connection 2 should be present in the list');
			t.is(conn2.accessLevel, AccessLevelEnum.edit);

			// Step 5: Verify admin user also sees all connections
			const adminGetConnectionsResponse = await request(app.getHttpServer())
				.get('/connections')
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminGetConnectionsResponse.status, 200);

			const adminConnections = adminGetConnectionsResponse.body.connections;
			const adminConn1 = adminConnections.find(({ connection }: any) => connection.id === connectionId1);
			const adminConn2 = adminConnections.find(({ connection }: any) => connection.id === connectionId2);
			t.truthy(adminConn1);
			t.truthy(adminConn2);
			t.is(adminConn1.accessLevel, AccessLevelEnum.edit);
			t.is(adminConn2.accessLevel, AccessLevelEnum.edit);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

currentTest = 'Cedar migration SaaS - GET /connection/groups/:slug';

test.serial(
	`${currentTest} should return groups for connection with correct access levels after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const simpleUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const simpleUserToken = simpleUserInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const testTable = await createTestTable(newConnection);

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnectionResponse.status, 201);
			const connectionId = JSON.parse(createConnectionResponse.text).id;

			// Get admin group id
			const getAdminGroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${connectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const adminGroups = JSON.parse(getAdminGroupsResponse.text);
			const adminGroupId = adminGroups[0].group.id;

			// Create two custom groups
			const customGroup1 = mockFactory.generateCreateGroupDto1();
			const createCustomGroup1Response = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', adminUserToken)
				.send(customGroup1)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const customGroupId1 = JSON.parse(createCustomGroup1Response.text).id;

			const customGroup2 = { title: `custom_group_2_${faker.string.uuid()}` };
			const createCustomGroup2Response = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', adminUserToken)
				.send(customGroup2)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const customGroupId2 = JSON.parse(createCustomGroup2Response.text).id;

			// Set permissions for group 1 - readonly
			const perms1 = {
				connection: { connectionId, accessLevel: AccessLevelEnum.readonly },
				group: { groupId: customGroupId1, accessLevel: AccessLevelEnum.readonly },
				tables: [
					{
						tableName: testTable.testTableName,
						accessLevel: { visibility: true, readonly: true, add: false, delete: false, edit: false },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${customGroupId1}?connectionId=${connectionId}`)
				.send({ permissions: perms1 })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Set permissions for group 2 - edit
			const perms2 = {
				connection: { connectionId, accessLevel: AccessLevelEnum.readonly },
				group: { groupId: customGroupId2, accessLevel: AccessLevelEnum.edit },
				tables: [
					{
						tableName: testTable.testTableName,
						accessLevel: { visibility: true, readonly: false, add: true, delete: true, edit: true },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${customGroupId2}?connectionId=${connectionId}`)
				.send({ permissions: perms2 })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Add simple user to group 1
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: customGroupId1, email: simpleUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 3: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 4: Admin user should see all groups (admin + 2 custom)
			const adminGetGroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${connectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminGetGroupsResponse.status, 200);
			const adminVisibleGroups = JSON.parse(adminGetGroupsResponse.text);
			t.is(adminVisibleGroups.length >= 3, true, 'Admin should see at least 3 groups (admin + 2 custom)');

			// Step 5: Simple user should see groups but NOT the admin group
			const simpleGetGroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(simpleGetGroupsResponse.status, 200);
			const simpleVisibleGroups = JSON.parse(simpleGetGroupsResponse.text);
			t.is(simpleVisibleGroups.length > 0, true, 'Simple user should see at least one group');

			// Simple user should not see the admin group
			const adminGroupVisible = simpleVisibleGroups.find((g: any) => g.group.id === adminGroupId);
			t.falsy(adminGroupVisible, 'Simple user should not see admin group');

			// Simple user should see the group they belong to with readonly access level
			const userGroup = simpleVisibleGroups.find((g: any) => g.group.id === customGroupId1);
			t.truthy(userGroup, 'Simple user should see their own group');
			t.is(userGroup.accessLevel, AccessLevelEnum.readonly);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

currentTest = 'Cedar migration SaaS - GET /connection/one/:slug';

test.serial(
	`${currentTest} should return connection details after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			const simpleUserInfo = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const simpleUserToken = simpleUserInfo.token;

			const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			await createTestTable(newConnection);

			const createConnectionResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(newConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createConnectionResponse.status, 201);
			const connectionId = JSON.parse(createConnectionResponse.text).id;

			// Create a group and add user with readonly permissions
			const newGroup = mockFactory.generateCreateGroupDto1();
			const createGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${connectionId}`)
				.set('Cookie', adminUserToken)
				.send(newGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const groupId = JSON.parse(createGroupResponse.text).id;

			const permissions = {
				connection: { connectionId, accessLevel: AccessLevelEnum.readonly },
				group: { groupId, accessLevel: AccessLevelEnum.readonly },
				tables: [],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${groupId}?connectionId=${connectionId}`)
				.send({ permissions })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId, email: simpleUserInfo.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 3: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 4: Admin can get full connection details
			const adminGetConnectionResponse = await request(app.getHttpServer())
				.get(`/connection/one/${connectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminGetConnectionResponse.status, 200);
			const adminConnectionResult = adminGetConnectionResponse.body.connection;
			t.is(adminConnectionResult.type, 'postgres');
			t.is(Object.hasOwn(adminConnectionResult, 'host'), true);
			t.is(typeof adminConnectionResult.port, 'number');

			// Step 5: Simple user can get connection details (readonly)
			const simpleGetConnectionResponse = await request(app.getHttpServer())
				.get(`/connection/one/${connectionId}`)
				.set('Cookie', simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(simpleGetConnectionResponse.status, 200);
			const simpleConnectionResult = simpleGetConnectionResponse.body.connection;
			t.is(simpleConnectionResult.type, 'postgres');
			t.is(Object.hasOwn(simpleConnectionResult, 'host'), true);
			t.is(Object.hasOwn(simpleConnectionResult, 'password'), false);
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

//****************************** CEDAR MIGRATION: demo connections, groups, and users access ******************************

currentTest = 'Cedar migration SaaS - demo connections access';

test.serial(
	`${currentTest} should allow access to demo-like connections, their groups, and group users after Cedar migration`,
	async (t) => {
		try {
			// Step 1: Set up WITHOUT Cedar - simulate demo connections scenario
			const adminUserInfo = await registerUserAndReturnUserInfo(app);
			const adminUserToken = adminUserInfo.token;

			// Invite two users into the company
			const user1Info = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const user1Token = user1Info.token;

			const user2Info = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				undefined,
				app,
				undefined,
			);
			const user2Token = user2Info.token;

			// Create multiple connections (simulating demo/test connections)
			const postgresConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
			const mysqlConnection = mockFactory.generateConnectionToTestMySQLDBInDocker();
			const testTablePostgres = await createTestTable(postgresConnection);
			const testTableMysql = await createTestTable(mysqlConnection);

			const createPostgresResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(postgresConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createPostgresResponse.status, 201);
			const postgresConnectionId = JSON.parse(createPostgresResponse.text).id;

			const createMysqlResponse = await request(app.getHttpServer())
				.post('/connection')
				.set('Cookie', adminUserToken)
				.send(mysqlConnection)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(createMysqlResponse.status, 201);
			const mysqlConnectionId = JSON.parse(createMysqlResponse.text).id;

			// Get admin group ids for both connections
			const getPostgresGroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${postgresConnectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const postgresGroupsList = JSON.parse(getPostgresGroupsResponse.text);
			const postgresAdminGroupId = postgresGroupsList.find((g: any) => g.group.isMain).group.id;

			const getMysqlGroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${mysqlConnectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const mysqlGroupsList = JSON.parse(getMysqlGroupsResponse.text);
			const mysqlAdminGroupId = mysqlGroupsList.find((g: any) => g.group.isMain).group.id;

			// Add user1 to admin group of postgres connection
			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: postgresAdminGroupId, email: user1Info.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Create a custom group on postgres connection for user2 with readonly
			const customGroup = mockFactory.generateCreateGroupDto1();
			const createCustomGroupResponse = await request(app.getHttpServer())
				.post(`/connection/group/${postgresConnectionId}`)
				.set('Cookie', adminUserToken)
				.send(customGroup)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			const customGroupId = JSON.parse(createCustomGroupResponse.text).id;

			const customPerms = {
				connection: { connectionId: postgresConnectionId, accessLevel: AccessLevelEnum.readonly },
				group: { groupId: customGroupId, accessLevel: AccessLevelEnum.readonly },
				tables: [
					{
						tableName: testTablePostgres.testTableName,
						accessLevel: { visibility: true, readonly: true, add: false, delete: false, edit: false },
					},
				],
			};

			await request(app.getHttpServer())
				.put(`/permissions/${customGroupId}?connectionId=${postgresConnectionId}`)
				.send({ permissions: customPerms })
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			await request(app.getHttpServer())
				.put('/group/user')
				.set('Cookie', adminUserToken)
				.send({ groupId: customGroupId, email: user2Info.email })
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			// Step 2: Run Cedar migration
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			await migratePermissionsToCedar(dataSource);

			// Step 3: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 4: Fetch all connections as admin
			const adminConnectionsResponse = await request(app.getHttpServer())
				.get('/connections')
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminConnectionsResponse.status, 200);
			const adminConnections = adminConnectionsResponse.body.connections;
			const foundPostgres = adminConnections.find(({ connection }: any) => connection.id === postgresConnectionId);
			const foundMysql = adminConnections.find(({ connection }: any) => connection.id === mysqlConnectionId);
			t.truthy(foundPostgres, 'Admin should see postgres connection');
			t.truthy(foundMysql, 'Admin should see mysql connection');

			// Step 5: Pick postgres connection - get its groups
			const postgresGroupsAfterMigration = await request(app.getHttpServer())
				.get(`/connection/groups/${postgresConnectionId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(postgresGroupsAfterMigration.status, 200);
			const postgresGroups = JSON.parse(postgresGroupsAfterMigration.text);
			t.is(postgresGroups.length >= 2, true, 'Should have at least admin group + custom group');

			// Find the admin group and custom group
			const adminGroup = postgresGroups.find((g: any) => g.group.id === postgresAdminGroupId);
			const customGroupResult = postgresGroups.find((g: any) => g.group.id === customGroupId);
			t.truthy(adminGroup, 'Admin group should be present');
			t.truthy(customGroupResult, 'Custom group should be present');

			// Step 6: Get users from admin group
			const adminGroupUsersResponse = await request(app.getHttpServer())
				.get(`/group/users/${postgresAdminGroupId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(adminGroupUsersResponse.status, 200);
			const adminGroupUsers = JSON.parse(adminGroupUsersResponse.text);
			t.is(adminGroupUsers.length >= 2, true, 'Admin group should have at least admin + user1');
			const user1InAdminGroup = adminGroupUsers.find(
				(u: any) => u.email.toLowerCase() === user1Info.email.toLowerCase(),
			);
			t.truthy(user1InAdminGroup, 'User1 should be in admin group');

			// Step 7: Get users from custom group
			const customGroupUsersResponse = await request(app.getHttpServer())
				.get(`/group/users/${customGroupId}`)
				.set('Cookie', adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(customGroupUsersResponse.status, 200);
			const customGroupUsers = JSON.parse(customGroupUsersResponse.text);
			t.is(customGroupUsers.length >= 1, true, 'Custom group should have at least user2');
			const user2InCustomGroup = customGroupUsers.find(
				(u: any) => u.email.toLowerCase() === user2Info.email.toLowerCase(),
			);
			t.truthy(user2InCustomGroup, 'User2 should be in custom group');

			// Step 8: Verify user1 (admin group) can access tables on postgres connection
			const user1TablesResponse = await request(app.getHttpServer())
				.get(`/connection/tables/${postgresConnectionId}`)
				.set('Cookie', user1Token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(user1TablesResponse.status, 200);

			// Step 9: Verify user2 (custom readonly group) can read but not add rows
			const user2GetRowsResponse = await request(app.getHttpServer())
				.get(`/table/rows/${postgresConnectionId}?tableName=${testTablePostgres.testTableName}`)
				.set('Cookie', user2Token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(user2GetRowsResponse.status, 200);

			const user2AddRowResponse = await request(app.getHttpServer())
				.post(`/table/row/${postgresConnectionId}?tableName=${testTablePostgres.testTableName}`)
				.send({
					[testTablePostgres.testTableColumnName]: faker.person.firstName(),
					[testTablePostgres.testTableSecondColumnName]: faker.internet.email(),
					created_at: new Date(),
					updated_at: new Date(),
				})
				.set('Cookie', user2Token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(user2AddRowResponse.status, 403);

			// Step 10: Verify user2 can also see groups (via group:read permission)
			const user2GroupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${postgresConnectionId}`)
				.set('Cookie', user2Token)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(user2GroupsResponse.status, 200);
			const user2Groups = JSON.parse(user2GroupsResponse.text);
			t.is(user2Groups.length > 0, true, 'User2 should see at least their group');

			// User2 should not see admin group
			const user2SeesAdmin = user2Groups.find((g: any) => g.group.id === postgresAdminGroupId);
			t.falsy(user2SeesAdmin, 'User2 should not see admin group');
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);

//****************************** CEDAR MIGRATION: demo-style connections (buildDefaultAdminGroups + buildDefaultAdminPermissions flow) ******************************

currentTest = 'Cedar migration SaaS - demo-style connections created via buildDefaultAdminGroups/Permissions';

test.serial(
	`${currentTest} should retain access after Cedar migration when permissions are created via the same flow as DemoDataService`,
	async (t) => {
		try {
			// This test replicates the exact same code flow that DemoDataService.createDemoData() uses:
			// 1. Create connection
			// 2. buildDefaultAdminGroups → save groups (with permissions: [])
			// 3. buildDefaultAdminPermissions → save permissions (with permission.groups = [group])
			// 4. Generate Cedar policies and re-save groups (the step that previously wiped the join table)
			// 5. NULL out Cedar policies to simulate old pre-fix state
			// 6. Run migration and verify access levels
			const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
			const userRepository = dataSource.getRepository(UserEntity);
			const companyRepository = dataSource.getRepository(CompanyInfoEntity);
			const connectionRepository = dataSource.getRepository(ConnectionEntity);
			const groupRepository = dataSource.getRepository(GroupEntity);
			const permissionRepository = dataSource.getRepository(PermissionEntity);

			const email = `demo_test_${faker.string.uuid()}@test.local`.toLowerCase();
			const password = '#r@dY^e&7R4b5Ib@31iE4xbn';

			const company = companyRepository.create({
				id: faker.string.uuid(),
				name: `demo_company_${faker.string.uuid()}`,
			});
			const savedCompany = await companyRepository.save(company);

			const user = userRepository.create({
				email,
				password,
				isActive: true,
				company: savedCompany,
				role: UserRoleEnum.ADMIN,
			});
			const savedUser = await userRepository.save(user);

			const tokenData = generateGwtToken(savedUser, []);
			const userToken = `${Constants.JWT_COOKIE_KEY_NAME}=${tokenData.token}`;

			// Step 1: Create a connection (same as DemoDataService but without isTestConnection to avoid test-connection pruning)
			const connectionEntity = connectionRepository.create({
				title: 'Demo-style Postgres',
				type: 'postgres' as any,
				host: 'testPg-e2e-testing',
				port: 5432,
				username: 'postgres',
				password: '123',
				database: 'postgres',
				masterEncryption: false,
				isTestConnection: false,
				author: savedUser,
			});
			const savedConnection = await connectionRepository.save(connectionEntity);

			// Step 2: buildDefaultAdminGroups (same as DemoDataService)
			const testGroupsEntities = buildDefaultAdminGroups(savedUser, [savedConnection]);
			const createdGroups = await Promise.all(
				testGroupsEntities.map(async (group: GroupEntity) => {
					return await groupRepository.save(group);
				}),
			);

			// Step 3: Create old-style permission entities (simulating pre-Cedar state)
			for (const group of createdGroups) {
				const connPerm = new PermissionEntity();
				connPerm.type = PermissionTypeEnum.Connection;
				connPerm.accessLevel = AccessLevelEnum.edit;
				connPerm.groups = [group];
				await permissionRepository.save(connPerm);

				const groupPerm = new PermissionEntity();
				groupPerm.type = PermissionTypeEnum.Group;
				groupPerm.accessLevel = AccessLevelEnum.edit;
				groupPerm.groups = [group];
				await permissionRepository.save(groupPerm);
			}

			// Step 4: Generate Cedar policies and re-save groups (same as DemoDataService fix)
			// This is the critical step: the fix in DemoDataService deletes group.permissions
			// before re-saving, otherwise TypeORM syncs the empty array and wipes the join table
			await Promise.all(
				createdGroups.map(async (group: GroupEntity) => {
					const connectionId = group.connection?.id;
					if (!connectionId) return;
					group.cedarPolicy = generateCedarPolicyForGroup(connectionId, group.isMain, {
						connection: { connectionId, accessLevel: AccessLevelEnum.edit },
						group: { groupId: group.id, accessLevel: AccessLevelEnum.edit },
						tables: [],
					});
					delete group.permissions;
					delete group.users;
					await groupRepository.save(group);
				}),
			);

			// Step 5: Verify permissions are still linked to groups (the fix should preserve them)
			for (const group of createdGroups) {
				const loadedGroup = await groupRepository
					.createQueryBuilder('group')
					.leftJoinAndSelect('group.permissions', 'permission')
					.where('group.id = :id', { id: group.id })
					.getOne();
				t.is(loadedGroup.permissions.length, 2, `Group ${group.id} should have 2 permissions (Connection + Group)`);
				const connectionPerm = loadedGroup.permissions.find((p) => p.type === PermissionTypeEnum.Connection);
				const groupPerm = loadedGroup.permissions.find((p) => p.type === PermissionTypeEnum.Group);
				t.truthy(connectionPerm, 'Should have Connection permission');
				t.truthy(groupPerm, 'Should have Group permission');
				t.is(connectionPerm.accessLevel, AccessLevelEnum.edit, 'Connection permission should be edit');
				t.is(groupPerm.accessLevel, AccessLevelEnum.edit, 'Group permission should be edit');
			}

			// Step 6: NULL out Cedar policies to simulate old pre-fix state
			for (const group of createdGroups) {
				await groupRepository.update(group.id, { cedarPolicy: null });
			}

			// Step 7: Run Cedar migration
			await migratePermissionsToCedar(dataSource);

			// Step 8: Enable Cedar
			process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
			await Cacher.clearAllCache();

			// Step 9: Verify migration regenerated correct Cedar policies
			for (const group of createdGroups) {
				const migratedGroup = await groupRepository.findOne({ where: { id: group.id } });
				t.truthy(migratedGroup.cedarPolicy, `Group ${group.id} should have a Cedar policy after migration`);
				t.truthy(
					migratedGroup.cedarPolicy.length > 0,
					`Group ${group.id} Cedar policy should not be empty`,
				);
			}

			// Step 10: Verify user can still access the connection via API with Cedar enabled
			const connectionsAfterMigration = await request(app.getHttpServer())
				.get('/connections')
				.set('Cookie', userToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(connectionsAfterMigration.status, 200);
			const connections = connectionsAfterMigration.body.connections;
			const demoConnection = connections.find(
				({ connection }) => connection.id === savedConnection.id,
			);
			t.truthy(demoConnection, 'Demo-style connection should be visible after Cedar migration');
			t.is(demoConnection.accessLevel, AccessLevelEnum.edit, 'Admin should have edit access after Cedar migration');

			// Step 11: Verify can get groups for the connection
			const groupsResponse = await request(app.getHttpServer())
				.get(`/connection/groups/${savedConnection.id}`)
				.set('Cookie', userToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');
			t.is(groupsResponse.status, 200);
			const groupsData = JSON.parse(groupsResponse.text);
			t.is(groupsData.length > 0, true, 'Connection should have at least one group');

			// Step 12: Verify can get group users
			for (const groupData of groupsData) {
				const groupUsersResponse = await request(app.getHttpServer())
					.get(`/group/users/${groupData.group.id}`)
					.set('Cookie', userToken)
					.set('Content-Type', 'application/json')
					.set('Accept', 'application/json');
				t.is(groupUsersResponse.status, 200, `Should be able to get users for group ${groupData.group.id}`);
				const groupUsers = JSON.parse(groupUsersResponse.text);
				t.is(groupUsers.length > 0, true, `Group ${groupData.group.id} should have at least one user`);
			}
		} catch (e) {
			console.error(e);
			throw e;
		} finally {
			delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		}
	},
);
