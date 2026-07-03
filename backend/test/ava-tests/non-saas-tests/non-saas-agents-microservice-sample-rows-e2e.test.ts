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
import { AccessLevelEnum } from '../../../src/enums/access-level.enum.js';
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
	inviteUserInCompanyAndAcceptInvitation,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

const mockFactory = new MockFactory();
let app: INestApplication;
let _testUtils: TestUtils;
const testTables: Array<string> = [];
let currentTest;

// Microservice JWT (request_id claim) for the internal agents controller.
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
		const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
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
	const connectionToTestDB = getTestData(mockFactory).connectionToMySQL;
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

function sampleRowsRequest(connectionId: string, body: Record<string, unknown>, withAuth = true): request.Test {
	const req = request(app.getHttpServer())
		.post(`/internal/agents/ai/data/${connectionId}/sample-rows`)
		.send(body)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return withAuth ? req.set('Authorization', microserviceAuthHeader()) : req;
}

currentTest = 'POST /internal/agents/ai/data/:connectionId/sample-rows (internal, microservice JWT)';

test.serial(`${currentTest} returns sample rows and a row count for the connection owner`, async (t) => {
	const { userId, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	const response = await sampleRowsRequest(connectionId, { userId, tableName: testTableName });
	t.is(response.status, 201);
	const ro = JSON.parse(response.text);
	t.is(ro.rows.length, 5);
	t.is(ro.rowCount, 42);
	t.is(typeof ro.largeDataset, 'boolean');
	for (const row of ro.rows) {
		t.is(Object.hasOwn(row, testTableColumnName), true);
		t.is(Object.hasOwn(row, testTableSecondColumnName), true);
	}
});

test.serial(`${currentTest} clamps the requested limit to 5`, async (t) => {
	const { userId, connectionId, testTableName } = await createConnectionAndTable();

	const clamped = await sampleRowsRequest(connectionId, { userId, tableName: testTableName, limit: 50 });
	t.is(clamped.status, 201);
	t.is(JSON.parse(clamped.text).rows.length, 5);

	const small = await sampleRowsRequest(connectionId, { userId, tableName: testTableName, limit: 2 });
	t.is(small.status, 201);
	t.is(JSON.parse(small.text).rows.length, 2);
});

test.serial(`${currentTest} rejects calls without the microservice JWT (401)`, async (t) => {
	const { userId, connectionId, testTableName } = await createConnectionAndTable();

	const response = await sampleRowsRequest(connectionId, { userId, tableName: testTableName }, false);
	t.is(response.status, 401);
});

test.serial(`${currentTest} denies a user with no permissions on the connection (403)`, async (t) => {
	const { connectionId, testTableName } = await createConnectionAndTable();
	const foreignUserToken = (await registerUserAndReturnUserInfo(app)).token;
	const foreignUserId = userIdFromCookieToken(foreignUserToken);

	const response = await sampleRowsRequest(connectionId, { userId: foreignUserId, tableName: testTableName });
	t.is(response.status, 403);
});

test.serial(`${currentTest} filters row columns to the user's readable-column whitelist`, async (t) => {
	const { token, connectionId, testTableName, testTableColumnName, testTableSecondColumnName } =
		await createConnectionAndTable();

	// Invite a second user into a new group that may read only one column of the table.
	const createGroupResponse = await request(app.getHttpServer())
		.post(`/connection/group/${connectionId}`)
		.send(mockFactory.generateCreateGroupDto1())
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(createGroupResponse.status, 201);
	const groupId = JSON.parse(createGroupResponse.text).id;

	const permissions = {
		connection: { connectionId, accessLevel: AccessLevelEnum.none },
		group: { groupId, accessLevel: AccessLevelEnum.none },
		tables: [
			{
				tableName: testTableName,
				accessLevel: { visibility: true, readonly: true, add: false, delete: false, edit: false },
				readableColumns: [testTableColumnName],
			},
		],
	};
	const savePermissionsResponse = await request(app.getHttpServer())
		.put(`/permissions/${groupId}?connectionId=${connectionId}`)
		.send({ permissions })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(savePermissionsResponse.status, 200);

	const invitedUser = await inviteUserInCompanyAndAcceptInvitation(token, undefined, app, groupId);
	const findInvitedUserResponse = await request(app.getHttpServer())
		.get('/user/')
		.set('Cookie', invitedUser.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(findInvitedUserResponse.status, 200);
	const invitedUserId = JSON.parse(findInvitedUserResponse.text).id;

	const response = await sampleRowsRequest(connectionId, { userId: invitedUserId, tableName: testTableName });
	t.is(response.status, 201);
	const ro = JSON.parse(response.text);
	t.true(ro.rows.length > 0);
	for (const row of ro.rows) {
		t.is(Object.hasOwn(row, testTableColumnName), true);
		t.is(Object.hasOwn(row, testTableSecondColumnName), false);
		t.is(Object.hasOwn(row, 'id'), false);
	}
});
