/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import { nanoid } from 'nanoid';
import path from 'path';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { MockFactory } from '../../mock.factory.js';
import {
	inviteUserInCompanyAndAcceptInvitation,
	inviteUserInCompanyAndGroupAndAcceptInvitation,
} from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';
import { createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions } from '../../utils/user-with-different-permissions-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

test.before(async () => {
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	app = moduleFixture.createNestApplication() as any;
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
		console.error('After custom field error: ' + e);
	}
});

currentTest = 'GET /company/my';

test.serial(`${currentTest} should return found company info for user`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get('/company/my')
			.set('Content-Type', 'application/json')
			.set('Cookie', simpleUserToken)
			.set('Accept', 'application/json');

		t.is(foundCompanyInfo.status, 200);
		const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
		t.is(Object.keys(foundCompanyInfoRO).length, 7); // plan 46: no logo / favicon / tab_title
		t.is(Object.hasOwn(foundCompanyInfoRO, 'id'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'name'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'createdAt'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'updatedAt'), true);
	} catch (error) {
		console.error(error);
	}
});

currentTest = 'GET /company/my/full';

test.serial(`${currentTest} should return full found company info for company admin user`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

		t.is(foundCompanyInfo.status, 200);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'id'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'name'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'createdAt'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'updatedAt'), true);
		t.is(Object.keys(foundCompanyInfoRO).length, 12); // plan 46: no logo / favicon / tab_title
		t.is(Object.hasOwn(foundCompanyInfoRO, 'connections'), true);
		t.is(foundCompanyInfoRO.connections.length > 3, true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'invitations'), true);
		t.is(foundCompanyInfoRO.invitations.length, 0);
		t.is(Object.keys(foundCompanyInfoRO.connections[0]).length, 7);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0], 'id'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0], 'title'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0], 'createdAt'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0], 'updatedAt'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0], 'author'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0], 'groups'), true);
		t.is(foundCompanyInfoRO.connections[0].groups.length > 0, true);
		t.is(Object.keys(foundCompanyInfoRO.connections[0].groups[0]).length, 5);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0], 'id'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0], 'title'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0], 'isMain'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0], 'cedarPolicy'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0], 'users'), true);
		t.is(foundCompanyInfoRO.connections[0].groups[0].users.length > 0, true);
		t.is(Object.keys(foundCompanyInfoRO.connections[0].groups[0].users[0]).length, 9);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0].users[0], 'id'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0].users[0], 'email'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0].users[0], 'role'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0].users[0], 'createdAt'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO.connections[0].groups[0].users[0], 'password'), false);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(`${currentTest} should return found company info for non-admin user`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', simpleUserToken)
			.set('Accept', 'application/json');

		const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

		t.is(foundCompanyInfo.status, 200);
		t.is(Object.keys(foundCompanyInfoRO).length, 7); // plan 46: no logo / favicon / tab_title
		t.is(Object.hasOwn(foundCompanyInfoRO, 'id'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'name'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'createdAt'), true);
		t.is(Object.hasOwn(foundCompanyInfoRO, 'updatedAt'), true);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'GET /company/my/email';

test.serial(`${currentTest} should return found company infos for admin user`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get(`/company/my/email/${testData.users.adminUserEmail}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

		t.is(foundCompanyInfo.status, 200);
		t.is(Array.isArray(foundCompanyInfoRO), true);
		t.is(foundCompanyInfoRO.length, 1);
		t.is(Object.hasOwn(foundCompanyInfoRO[0], 'id'), true);
		t.is(Object.keys(foundCompanyInfoRO[0]).length, 2);
		t.is(Object.hasOwn(foundCompanyInfoRO[0], 'name'), true);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(`${currentTest} should return found company infos for non-admin user`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get(`/company/my/email/${testData.users.simpleUserEmail}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

		t.is(foundCompanyInfo.status, 200);
		t.is(Array.isArray(foundCompanyInfoRO), true);
		t.is(foundCompanyInfoRO.length, 1);
		t.is(Object.keys(foundCompanyInfoRO[0]).length, 2);
		t.is(Object.hasOwn(foundCompanyInfoRO[0], 'name'), true);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'DELETE /:companyId/user/:userId';

test.serial(`${currentTest} should remove user from company`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

		t.is(foundCompanyInfo.status, 200);

		const allGroupsInResult = foundCompanyInfoRO.connections.flatMap((connection) => connection.groups);
		const allUsersInResult = allGroupsInResult.flatMap((group) => group.users);
		const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail.toLowerCase());

		t.is(foundSimpleUserInResult.email, simpleUserEmail.toLowerCase());

		const removeUserFromCompanyResult = await request(app.getHttpServer())
			.delete(`/company/${foundCompanyInfoRO.id}/user/${foundSimpleUserInResult.id}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		const removeUserFromCompany = JSON.parse(removeUserFromCompanyResult.text);

		t.is(removeUserFromCompanyResult.status, 200);
		t.is(removeUserFromCompany.success, true);

		const foundCompanyInfoAfterUserDeletion = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		const foundCompanyInfoROAfterUserDeletion = JSON.parse(foundCompanyInfoAfterUserDeletion.text);

		const allGroupsInResultAfterUserDeletion = foundCompanyInfoROAfterUserDeletion.connections.flatMap(
			(connection) => connection.groups,
		);
		const allUsersInResultAfterUserDeletion = allGroupsInResultAfterUserDeletion.flatMap((group) => group.users);
		const foundSimpleUserInResultAfterUserDeletion = !!allUsersInResultAfterUserDeletion.find(
			(user) => user.email === simpleUserEmail,
		);

		t.is(foundSimpleUserInResultAfterUserDeletion, false);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

test.serial(
	`${currentTest} should remove user from company. User with the same email can be invited in this company one more time`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
			const {
				connections,
				firstTableInfo,
				groups,
				permissions,
				secondTableInfo,
				users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
				groups: { createdGroupId },
			} = testData;

			const foundCompanyInfo = await request(app.getHttpServer())
				.get('/company/my/full')
				.set('Content-Type', 'application/json')
				.set('Cookie', adminUserToken)
				.set('Accept', 'application/json');

			const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

			t.is(foundCompanyInfo.status, 200);

			const allGroupsInResult = foundCompanyInfoRO.connections.flatMap((connection) => connection.groups);
			const allUsersInResult = allGroupsInResult.flatMap((group) => group.users);
			const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail.toLowerCase());

			t.is(foundSimpleUserInResult.email, simpleUserEmail.toLowerCase());

			const removeUserFromCompanyResult = await request(app.getHttpServer())
				.delete(`/company/${foundCompanyInfoRO.id}/user/${foundSimpleUserInResult.id}`)
				.set('Content-Type', 'application/json')
				.set('Cookie', adminUserToken)
				.set('Accept', 'application/json');

			const removeUserFromCompany = JSON.parse(removeUserFromCompanyResult.text);

			t.is(removeUserFromCompanyResult.status, 200);
			t.is(removeUserFromCompany.success, true);

			const foundCompanyInfoAfterUserDeletion = await request(app.getHttpServer())
				.get('/company/my/full')
				.set('Content-Type', 'application/json')
				.set('Cookie', adminUserToken)
				.set('Accept', 'application/json');

			const foundCompanyInfoROAfterUserDeletion = JSON.parse(foundCompanyInfoAfterUserDeletion.text);

			const allGroupsInResultAfterUserDeletion = foundCompanyInfoROAfterUserDeletion.connections.flatMap(
				(connection) => connection.groups,
			);
			const allUsersInResultAfterUserDeletion = allGroupsInResultAfterUserDeletion.flatMap((group) => group.users);
			const foundSimpleUserInResultAfterUserDeletion = !!allUsersInResultAfterUserDeletion.find(
				(user) => user.email === simpleUserEmail,
			);

			t.is(foundSimpleUserInResultAfterUserDeletion, false);

			const invitedDeletedUser = await inviteUserInCompanyAndAcceptInvitation(
				adminUserToken,
				'USER',
				app,
				createdGroupId,
				simpleUserEmail,
			);
			t.is(invitedDeletedUser.email, simpleUserEmail);
			t.truthy(invitedDeletedUser.token);
			t.truthy(invitedDeletedUser.password);
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
);

currentTest = 'PUT invitation/revoke/:slug';

test.serial(`${currentTest} should revoke user invitation from company`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
		t.is(foundCompanyInfoRO.invitations.length, 0);

		const allGroupsInResult = foundCompanyInfoRO.connections.flatMap((connection) => connection.groups);
		const allUsersInResult = allGroupsInResult.flatMap((group) => group.users);
		const foundSimpleUserInResult = allUsersInResult.find((user) => user.email === simpleUserEmail.toLowerCase());

		const removeUserFromCompanyResult = await request(app.getHttpServer())
			.delete(`/company/${foundCompanyInfoRO.id}/user/${foundSimpleUserInResult.id}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		t.is(removeUserFromCompanyResult.status, 200);

		const invitationRequestBody = {
			companyId: foundCompanyInfoRO.id,
			email: simpleUserEmail,
			role: 'USER',
			groupId: foundCompanyInfoRO.connections[0].groups[0].id,
		};

		const invitationResult = await request(app.getHttpServer())
			.put(`/company/user/${foundCompanyInfoRO.id}`)
			.send(invitationRequestBody)
			.set('Cookie', adminUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(invitationResult.status, 200);

		const foundCompanyInfoWithInvitation = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		const foundCompanyInfoWithInvitationRO = JSON.parse(foundCompanyInfoWithInvitation.text);
		t.is(foundCompanyInfoWithInvitationRO.invitations.length, 1);

		const deleteInvitationResult = await request(app.getHttpServer())
			.put(`/company/invitation/revoke/${foundCompanyInfoRO.id}`)
			.send({
				email: simpleUserEmail,
			})
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		t.is(deleteInvitationResult.status, 200);

		const foundCompanyInfoAfterInvitationDeletion = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		const foundCompanyInfoROAfterInvitationDeletion = JSON.parse(foundCompanyInfoAfterInvitationDeletion.text);
		t.is(foundCompanyInfoROAfterInvitationDeletion.invitations.length, 0);
	} catch (error) {
		console.error(error);
		throw error;
	}
});

currentTest = 'PUT company/name/:slug';

test.serial(`${currentTest} should update company name`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
	t.is(Object.hasOwn(foundCompanyInfoRO, 'name'), true);

	const newName = `${faker.company.name()}_${nanoid(5)}`;
	const updateCompanyNameResult = await request(app.getHttpServer())
		.put(`/company/name/${foundCompanyInfoRO.id}`)
		.send({
			name: newName,
		})
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	t.is(updateCompanyNameResult.status, 200);

	const foundCompanyInfoAfterUpdate = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoROAfterUpdate = JSON.parse(foundCompanyInfoAfterUpdate.text);
	t.is(Object.hasOwn(foundCompanyInfoROAfterUpdate, 'name'), true);
	t.is(foundCompanyInfoROAfterUpdate.name, newName);
});

currentTest = 'GET company/name/:companyId';

test.serial(`${currentTest} should return company name`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);

	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

	const foundCompanyName = await request(app.getHttpServer())
		.get(`/company/name/${foundCompanyInfoRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(foundCompanyName.status, 200);
	const foundCompanyNameRO = JSON.parse(foundCompanyName.text);
	t.is(Object.hasOwn(foundCompanyNameRO, 'name'), true);
	t.is(foundCompanyNameRO.name, foundCompanyInfoRO.name);
	t.pass();
});

currentTest = `GET company/users/:companyId`;

test.serial(`${currentTest} should return users in company`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);

	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

	const usersInCompany = await request(app.getHttpServer())
		.get(`/company/users/${foundCompanyInfoRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(usersInCompany.status, 200);
	const usersInCompanyRO = JSON.parse(usersInCompany.text);
	t.is(usersInCompanyRO.length, 2);

	usersInCompanyRO.forEach((user) => {
		t.true('id' in user);
		t.true('isActive' in user);
		t.true('email' in user);
		t.true('createdAt' in user);
		t.true('suspended' in user);
		t.true('name' in user);
		t.true('is_2fa_enabled' in user);
		t.true('role' in user);
		t.true('externalRegistrationProvider' in user);
		t.true('user_membership' in user);
		t.true('has_groups' in user);

		t.true(Array.isArray(user.user_membership));
		user.user_membership.forEach((user_membership) => {
			t.true('id' in user_membership);
			t.true('title' in user_membership);
			t.true('database' in user_membership);
			t.true(Array.isArray(user_membership.groups));
			user_membership.groups.forEach((group) => {
				t.true('id' in group);
				t.true('title' in group);
				t.is(Object.keys(group).length, 2);
			});
		});
	});
});

currentTest = `PUT company/users/roles/:companyId`;

test.serial(`${currentTest} should update user roles in company`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);

	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

	const usersInCompany = await request(app.getHttpServer())
		.get(`/company/users/${foundCompanyInfoRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(usersInCompany.status, 200);
	const usersInCompanyRO = JSON.parse(usersInCompany.text);

	t.is(usersInCompanyRO.length, 2);

	const foundNonAdminUser = usersInCompanyRO.find((user) => user.role === 'USER');
	t.is(!!foundNonAdminUser, true);

	const updateUserRoleRequest = {
		users: [
			{
				userId: foundNonAdminUser.id,
				role: 'ADMIN',
			},
		],
	};

	const updateUserRoleResult = await request(app.getHttpServer())
		.put(`/company/users/roles/${foundCompanyInfoRO.id}`)
		.send(updateUserRoleRequest)
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(updateUserRoleResult.status, 200);
	const updateUserRoleResultRO = JSON.parse(updateUserRoleResult.text);
	t.is(updateUserRoleResultRO.success, true);

	const usersInCompanyAfterUpdate = await request(app.getHttpServer())
		.get(`/company/users/${foundCompanyInfoRO.id}`)
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(usersInCompanyAfterUpdate.status, 200);
	const usersInCompanyROAfterUpdate = JSON.parse(usersInCompanyAfterUpdate.text);

	t.is(usersInCompanyROAfterUpdate.length, 2);

	for (const user of usersInCompanyROAfterUpdate) {
		t.is(user.role, 'ADMIN');
	}
});

currentTest = `DELETE company`;

test.serial(`${currentTest} should delete company`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail },
	} = testData;
	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);

	const deleteCompanyResult = await request(app.getHttpServer())
		.delete(`/company/my`)
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	const deleteCompanyResultRO = JSON.parse(deleteCompanyResult.text);
	t.is(deleteCompanyResult.status, 200);
	t.is(deleteCompanyResultRO.success, true);

	const foundCompanyInfoAfterDelete = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfoAfterDelete.status, 401);
});

currentTest = `PUT company/2fa/:companyId`;
test.serial(`${currentTest} should enable 2fa for company`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail, simpleUserPassword },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);

	const foundCompanyRo = JSON.parse(foundCompanyInfo.text);
	t.is(Object.hasOwn(foundCompanyRo, 'is2faEnabled'), true);
	t.is(foundCompanyRo.is2faEnabled, false);

	const requestBody = {
		is2faEnabled: true,
	};
	const enable2faResult = await request(app.getHttpServer())
		.put(`/company/2fa/${foundCompanyRo.id}`)
		.send(requestBody)
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(enable2faResult.status, 200);

	const foundCompanyInfoAfterUpdate = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfoAfterUpdate.status, 200);
	const foundCompanyRoAfterUpdate = JSON.parse(foundCompanyInfoAfterUpdate.text);
	t.is(Object.hasOwn(foundCompanyRoAfterUpdate, 'is2faEnabled'), true);
	t.is(foundCompanyRoAfterUpdate.is2faEnabled, true);

	// user should not be able to use endpoints that require 2fa after login

	const userLoginInfo = {
		email: simpleUserEmail,
		password: simpleUserPassword,
	};

	const loginUserResponse = await request(app.getHttpServer())
		.post('/user/login/')
		.send(userLoginInfo)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	if (loginUserResponse.status > 201) {
		console.info('loginUserResponse.text -> ', loginUserResponse.text);
	}

	const newSimpleUserToken = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(loginUserResponse)}`;
	const connectionsResult = await request(app.getHttpServer())
		.get('/connections')
		.set('Content-Type', 'application/json')
		.set('Cookie', newSimpleUserToken)
		.set('Accept', 'application/json');

	t.is(connectionsResult.status, 400);

	const connectionsResultsObject = JSON.parse(connectionsResult.text);
	t.is(connectionsResultsObject.message, Messages.TWO_FA_REQUIRED);
});

currentTest = `PUT /company/users/suspend/:companyId`;
test.serial(`${currentTest} should suspend users in company`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail, simpleUserPassword },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

	let firstConnection = foundCompanyInfoRO.connections.find((connectionRO) => connections.firstId === connectionRO.id);
	const createdGroup = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);

	const additionalUsers: Array<{
		email: string;
		password: string;
		token: string;
	}> = [];
	for (let i = 0; i < 5; i++) {
		const invitationResult = await inviteUserInCompanyAndGroupAndAcceptInvitation(
			adminUserToken,
			'USER',
			createdGroup.id,
			app,
		);
		additionalUsers.push(invitationResult);
	}
	const foundCompanyInfoWithAddedUsers = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoWithAddedUsersRO = JSON.parse(foundCompanyInfoWithAddedUsers.text);
	firstConnection = foundCompanyInfoWithAddedUsersRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const { users } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
	users.forEach((user: any) => {
		t.is(user.suspended, false);
	});

	const suspendUsersResult = await request(app.getHttpServer())
		.put(`/company/users/suspend/${foundCompanyInfoRO.id}`)
		.send({
			usersEmails: additionalUsers.map((user: any) => user.email),
		})
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(suspendUsersResult.status, 200);

	const foundCompanyInfoAfterSuspend = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	const foundCompanyInfoAfterSuspendRO = JSON.parse(foundCompanyInfoAfterSuspend.text);
	firstConnection = foundCompanyInfoAfterSuspendRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const { users: usersAfterSuspend } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
	const suspendUsersCount = usersAfterSuspend.filter((user: any) => user.suspended).length;
	t.is(suspendUsersCount, 5);
});

currentTest = `PUT /company/users/unsuspend/:companyId`;
test.serial(`${currentTest} should suspend users in company`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		firstTableInfo,
		groups,
		permissions,
		secondTableInfo,
		users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail, simpleUserPassword },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

	let firstConnection = foundCompanyInfoRO.connections.find((connectionRO) => connections.firstId === connectionRO.id);
	const createdGroup = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);

	const additionalUsers: Array<{
		email: string;
		password: string;
		token: string;
	}> = [];
	for (let i = 0; i < 5; i++) {
		const invitationResult = await inviteUserInCompanyAndGroupAndAcceptInvitation(
			adminUserToken,
			'USER',
			createdGroup.id,
			app,
		);
		additionalUsers.push(invitationResult);
	}
	const foundCompanyInfoWithAddedUsers = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoWithAddedUsersRO = JSON.parse(foundCompanyInfoWithAddedUsers.text);
	firstConnection = foundCompanyInfoWithAddedUsersRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const { users } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
	users.forEach((user: any) => {
		t.is(user.suspended, false);
	});

	const suspendUsersResult = await request(app.getHttpServer())
		.put(`/company/users/suspend/${foundCompanyInfoRO.id}`)
		.send({
			usersEmails: additionalUsers.map((user: any) => user.email),
		})
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(suspendUsersResult.status, 200);

	const foundCompanyInfoAfterSuspend = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	const foundCompanyInfoAfterSuspendRO = JSON.parse(foundCompanyInfoAfterSuspend.text);
	firstConnection = foundCompanyInfoAfterSuspendRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const { users: usersAfterSuspend } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
	const suspendUsersCount = usersAfterSuspend.filter((user: any) => user.suspended).length;
	t.is(suspendUsersCount, 5);

	const unsuspendUsersResult = await request(app.getHttpServer())
		.put(`/company/users/unsuspend/${foundCompanyInfoRO.id}`)
		.send({
			usersEmails: additionalUsers.map((user: any) => user.email),
		})
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	t.is(unsuspendUsersResult.status, 200);

	const foundCompanyInfoAfterUnsuspend = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');

	const foundCompanyInfoAfterUnsuspendRO = JSON.parse(foundCompanyInfoAfterUnsuspend.text);
	firstConnection = foundCompanyInfoAfterUnsuspendRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const { users: usersAfterUnsuspend } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
	const unsuspendUsersCount = usersAfterUnsuspend.filter((user: any) => !user.suspended).length;
	t.is(unsuspendUsersCount, 7);
});

currentTest = 'PUT /company/connections/display/';
test.serial(
	`${currentTest} should toggle to 'off ' show test connections option in company. Test connections should not be returned `,
	async (t) => {
		const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
		const {
			connections,
			firstTableInfo,
			groups,
			permissions,
			secondTableInfo,
			users: { adminUserToken, simpleUserToken, adminUserEmail, simpleUserEmail, simpleUserPassword },
		} = testData;

		const foundCompanyInfo = await request(app.getHttpServer())
			.get('/company/my/full')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		t.is(foundCompanyInfo.status, 200);
		const _foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

		const foundUserTestConnectionsInfo = await request(app.getHttpServer())
			.get('/connections')
			.set('Cookie', simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(foundUserTestConnectionsInfo.status, 200);

		const result = foundUserTestConnectionsInfo.body.connections;

		t.is(result.length, 3);

		// toggle to off
		const toggleTestConnectionsResponse = await request(app.getHttpServer())
			.put('/company/connections/display/?displayMode=off')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');
		t.is(toggleTestConnectionsResponse.status, 200);

		const resultAfterToggle = await request(app.getHttpServer())
			.get('/connections')
			.set('Cookie', simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const resultAfterToggleRO = JSON.parse(resultAfterToggle.text);
		t.is(resultAfterToggle.status, 200);
		t.is(resultAfterToggleRO.connections.length, 1);

		// toggle to on

		const toggleTestConnectionsResponseOn = await request(app.getHttpServer())
			.put('/company/connections/display/?displayMode=on')
			.set('Content-Type', 'application/json')
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');

		t.is(toggleTestConnectionsResponseOn.status, 200);

		const resultAfterToggleOn = await request(app.getHttpServer())
			.get('/connections')
			.set('Cookie', simpleUserToken)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const resultAfterToggleOnRO = JSON.parse(resultAfterToggleOn.text);

		t.is(resultAfterToggleOn.status, 200);
		t.is(resultAfterToggleOnRO.connections.length, 3);
	},
);

// ---------------------------------------------------------------------------------------------
// Plan 46 (2026-09-17): RocketAdmin is a free product. No member cap on FREE_PLAN companies, no
// plan-driven suspension, and the white-label routes (logo / favicon / tab title) are gone.

currentTest = 'plan 46 — RocketAdmin is free';
test.serial(`${currentTest} a company invites a 4th, 5th … 7th member and nobody is suspended`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		groups,
		users: { adminUserToken },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
	let firstConnection = foundCompanyInfoRO.connections.find((connectionRO) => connections.firstId === connectionRO.id);
	const createdGroup = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);

	// admin + first simple user already exist: five more invitations take the company to 7 members,
	// well past the old 3-seat free cap. Every invitation must be accepted (a token comes back).
	const additionalUsers: Array<{ email: string; password: string; token: string }> = [];
	for (let i = 0; i < 5; i++) {
		const invitationResult = await inviteUserInCompanyAndGroupAndAcceptInvitation(
			adminUserToken,
			'USER',
			createdGroup.id,
			app,
		);
		t.truthy(invitationResult.token, `invitation ${i + 1} must be accepted`);
		additionalUsers.push(invitationResult);
	}

	const foundCompanyInfoWithAddedUsers = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	t.is(foundCompanyInfoWithAddedUsers.status, 200);
	const foundCompanyInfoWithAddedUsersRO = JSON.parse(foundCompanyInfoWithAddedUsers.text);
	firstConnection = foundCompanyInfoWithAddedUsersRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const { users } = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
	t.is(users.length, 7);
	for (const user of users) {
		t.is(user.suspended, false);
	}

	// The 7th member can use the API — nothing suspended them.
	const lastUserConnections = await request(app.getHttpServer())
		.get('/connections')
		.set('Cookie', additionalUsers[additionalUsers.length - 1].token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(lastUserConnections.status, 200);

	// The company payload carries no white-label fields and a null custom domain.
	t.is(foundCompanyInfoWithAddedUsersRO.custom_domain, null);
	t.false(Object.hasOwn(foundCompanyInfoWithAddedUsersRO, 'logo'));
	t.false(Object.hasOwn(foundCompanyInfoWithAddedUsersRO, 'favicon'));
	t.false(Object.hasOwn(foundCompanyInfoWithAddedUsersRO, 'tab_title'));
});

test.serial(`${currentTest} unsuspending past 3 members is allowed`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		connections,
		groups,
		users: { adminUserToken },
	} = testData;

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);
	const firstConnection = foundCompanyInfoRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const createdGroup = firstConnection.groups.find((groupRO) => groupRO.id === groups.createdGroupId);

	const invitedEmails: Array<string> = [];
	for (let i = 0; i < 4; i++) {
		const invitationResult = await inviteUserInCompanyAndGroupAndAcceptInvitation(
			adminUserToken,
			'USER',
			createdGroup.id,
			app,
		);
		invitedEmails.push(invitationResult.email);
	}

	const suspendUsersResult = await request(app.getHttpServer())
		.put(`/company/users/suspend/${foundCompanyInfoRO.id}`)
		.send({ usersEmails: invitedEmails })
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	t.is(suspendUsersResult.status, 200);

	// 2 active + 4 suspended → unsuspend all 4 (would have exceeded the old free cap of 3).
	const unsuspendUsersResult = await request(app.getHttpServer())
		.put(`/company/users/unsuspend/${foundCompanyInfoRO.id}`)
		.send({ usersEmails: invitedEmails })
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	t.is(unsuspendUsersResult.status, 200, unsuspendUsersResult.text);

	const foundCompanyInfoAfter = await request(app.getHttpServer())
		.get('/company/my/full')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	const foundCompanyInfoAfterRO = JSON.parse(foundCompanyInfoAfter.text);
	const connectionAfter = foundCompanyInfoAfterRO.connections.find(
		(connectionRO) => connections.firstId === connectionRO.id,
	);
	const { users } = connectionAfter.groups.find((groupRO) => groupRO.id === groups.createdGroupId);
	t.is(users.filter((user: any) => user.suspended).length, 0);
});

test.serial(`${currentTest} white-label routes no longer exist (404); the properties stub answers empty`, async (t) => {
	const testData = await createConnectionsAndInviteNewUserInNewGroupWithGroupPermissions(app);
	const {
		users: { adminUserToken },
	} = testData;
	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my')
		.set('Content-Type', 'application/json')
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	t.is(foundCompanyInfo.status, 200);
	const companyId = JSON.parse(foundCompanyInfo.text).id;

	const retiredRoutes: Array<{ method: 'get' | 'post' | 'delete'; path: string }> = [
		{ method: 'post', path: `/company/logo/${companyId}` },
		{ method: 'get', path: `/company/logo/${companyId}` },
		{ method: 'delete', path: `/company/logo/${companyId}` },
		{ method: 'post', path: `/company/favicon/${companyId}` },
		{ method: 'get', path: `/company/favicon/${companyId}` },
		{ method: 'delete', path: `/company/favicon/${companyId}` },
		{ method: 'post', path: `/company/tab-title/${companyId}` },
		{ method: 'get', path: `/company/tab-title/${companyId}` },
		{ method: 'delete', path: `/company/tab-title/${companyId}` },
	];
	for (const route of retiredRoutes) {
		const result = await request(app.getHttpServer())
			[route.method](route.path)
			.set('Cookie', adminUserToken)
			.set('Accept', 'application/json');
		t.is(result.status, 404, `${route.method.toUpperCase()} ${route.path}: ${result.text}`);
	}

	// TEMPORARY stub for the deployed Angular shell: always empty, never 404.
	const whiteLabel = await request(app.getHttpServer())
		.get(`/company/white-label-properties/${companyId}`)
		.set('Cookie', adminUserToken)
		.set('Accept', 'application/json');
	t.is(whiteLabel.status, 200, whiteLabel.text);
	t.deepEqual(JSON.parse(whiteLabel.text), { logo: null, favicon: null, tab_title: null, subscriptionLevel: null });
});
