/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { AccessLevelEnum } from '../../../src/enums/index.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

test.before(async () => {
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
});

test.after(async () => {
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After hosted connection test error: ' + e);
	}
});

function generateSaasToken(): string {
	const jwtSecret = process.env.MICROSERVICE_JWT_SECRET;
	return jwt.sign({ request_id: faker.string.uuid() }, jwtSecret, { expiresIn: '1h' });
}

currentTest = 'POST /saas/connection/hosted';

test.serial(`${currentTest} should create a hosted postgres connection with admin group and permissions`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);

		// Get user info to obtain userId and companyId
		const getUserResult = await request(app.getHttpServer())
			.get('/user')
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');
		t.is(getUserResult.status, 200);
		const userInfo = JSON.parse(getUserResult.text);
		const userId = userInfo.id;
		const companyId = userInfo.company.id;

		const saasToken = generateSaasToken();

		// Create hosted connection via SaaS endpoint
		const createHostedConnectionResult = await request(app.getHttpServer())
			.post('/saas/connection/hosted')
			.send({
				companyId: companyId,
				userId: userId,
				hostedDatabaseId: faker.string.uuid(),
				databaseName: 'postgres',
				hostname: 'testPg-e2e-testing',
				port: 5432,
				username: 'postgres',
				password: '123',
			})
			.set('Authorization', `Bearer ${saasToken}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const createdConnection = JSON.parse(createHostedConnectionResult.text);
		console.log('🚀 ~ createdConnection:', createdConnection);

		t.is(createHostedConnectionResult.status, 201);
		const connectionId = createdConnection.connectionId;

		// Verify connection was created
		t.truthy(connectionId);

		// Verify connection is accessible via connection groups endpoint
		const groupsResponse = await request(app.getHttpServer())
			.get(`/connection/groups/${connectionId}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');

		t.is(groupsResponse.status, 200);
		const groups = JSON.parse(groupsResponse.text);
		t.is(groups.length, 1);
		t.is(groups[0].accessLevel, AccessLevelEnum.edit);
		const adminGroup = groups[0];

		// Verify tables endpoint works with this connection
		const findTablesResponse = await request(app.getHttpServer())
			.get(`/connection/tables/${connectionId}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');

		t.is(findTablesResponse.status, 200);
		const tables = JSON.parse(findTablesResponse.text);
		t.true(Array.isArray(tables));

		// Verify user permissions - user should have full access
		const groupId = adminGroup.group.id;
		const permissionsResponse = await request(app.getHttpServer())
			.get(`/connection/permissions?connectionId=${connectionId}&groupId=${groupId}`)
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');

		t.is(permissionsResponse.status, 200);
		const permissions = JSON.parse(permissionsResponse.text);
		t.truthy(permissions);
	} catch (e) {
		console.error('Test error:', e);
		throw e;
	}
});

test.serial(`${currentTest} should return validation error when required fields are missing`, async (t) => {
	try {
		const saasToken = generateSaasToken();

		const result = await request(app.getHttpServer())
			.post('/saas/connection/hosted')
			.send({
				companyId: faker.string.uuid(),
				// missing userId, databaseName, hostname, port, username, password
			})
			.set('Authorization', `Bearer ${saasToken}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(result.status, 400);
	} catch (e) {
		console.error('Test error:', e);
		throw e;
	}
});

test.serial(`${currentTest} should return error when userId does not exist`, async (t) => {
	try {
		const saasToken = generateSaasToken();

		const result = await request(app.getHttpServer())
			.post('/saas/connection/hosted')
			.send({
				companyId: faker.string.uuid(),
				userId: faker.string.uuid(),
				hostedDatabaseId: faker.string.uuid(),
				databaseName: 'postgres',
				hostname: 'testPg-e2e-testing',
				port: 5432,
				username: 'postgres',
				password: '123',
			})
			.set('Authorization', `Bearer ${saasToken}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const responseBody = JSON.parse(result.text);
		console.log('🚀 ~ responseBody:', responseBody);
		t.is(result.status, 500);
	} catch (e) {
		console.error('Test error:', e);
		throw e;
	}
});

currentTest = 'POST /saas/connection/hosted/delete';

test.serial(`${currentTest} should delete a hosted connection`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);

		// Get user info
		const getUserResult = await request(app.getHttpServer())
			.get('/user')
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');
		t.is(getUserResult.status, 200);
		const userInfo = JSON.parse(getUserResult.text);
		const userId = userInfo.id;
		const companyId = userInfo.company.id;

		const saasToken = generateSaasToken();

		// Create a hosted connection first
		const createResult = await request(app.getHttpServer())
			.post('/saas/connection/hosted')
			.send({
				companyId: companyId,
				userId: userId,
				hostedDatabaseId: faker.string.uuid(),
				databaseName: 'postgres',
				hostname: 'testPg-e2e-testing',
				port: 5432,
				username: 'postgres',
				password: '123',
			})
			.set('Authorization', `Bearer ${saasToken}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		const createdConnection = JSON.parse(createResult.text);
		console.log('🚀 ~ createdConnection:', createdConnection);
		t.is(createResult.status, 201);
		const connectionId = createdConnection.connectionId;

		// Verify connection exists
		const connectionsBeforeDelete = await request(app.getHttpServer())
			.get('/connections')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(connectionsBeforeDelete.status, 200);
		const connectionsBefore = JSON.parse(connectionsBeforeDelete.text);
		const foundBefore = connectionsBefore.connections.find((c: any) => c.connection.id === connectionId);
		t.truthy(foundBefore);

		// Delete the hosted connection
		const deleteResult = await request(app.getHttpServer())
			.post('/saas/connection/hosted/delete')
			.send({
				companyId: companyId,
				hostedDatabaseId: connectionId,
				databaseName: 'postgres',
			})
			.set('Authorization', `Bearer ${saasToken}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(deleteResult.status, 201);

		// Verify connection was deleted
		const connectionsAfterDelete = await request(app.getHttpServer())
			.get('/connections')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(connectionsAfterDelete.status, 200);
		const connectionsAfter = JSON.parse(connectionsAfterDelete.text);
		const foundAfter = connectionsAfter.connections.find((c: any) => c.connection.id === connectionId);
		t.falsy(foundAfter);
	} catch (e) {
		console.error('Test error:', e);
		throw e;
	}
});

test.serial(`${currentTest} should return error when connection does not exist`, async (t) => {
	try {
		const { token } = await registerUserAndReturnUserInfo(app);

		const getUserResult = await request(app.getHttpServer())
			.get('/user')
			.set('Content-Type', 'application/json')
			.set('Cookie', token)
			.set('Accept', 'application/json');
		const userInfo = JSON.parse(getUserResult.text);
		const companyId = userInfo.company.id;

		const saasToken = generateSaasToken();

		const deleteResult = await request(app.getHttpServer())
			.post('/saas/connection/hosted/delete')
			.send({
				companyId: companyId,
				hostedDatabaseId: faker.string.uuid(),
				databaseName: 'postgres',
			})
			.set('Authorization', `Bearer ${saasToken}`)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(deleteResult.status, 404);
	} catch (e) {
		console.error('Test error:', e);
		throw e;
	}
});

test.serial('SaaS auth middleware should reject requests without valid token', async (t) => {
	try {
		const result = await request(app.getHttpServer())
			.post('/saas/connection/hosted')
			.send({
				companyId: faker.string.uuid(),
				userId: faker.string.uuid(),
				databaseName: 'postgres',
				hostname: 'testPg-e2e-testing',
				port: 5432,
				username: 'postgres',
				password: '123',
			})
			.set('Authorization', 'Bearer invalid-token')
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(result.status, 401);
	} catch (e) {
		console.error('Test error:', e);
		throw e;
	}
});

test.serial('SaaS auth middleware should reject requests without token', async (t) => {
	try {
		const result = await request(app.getHttpServer())
			.post('/saas/connection/hosted')
			.send({
				companyId: faker.string.uuid(),
				userId: faker.string.uuid(),
				databaseName: 'postgres',
				hostname: 'testPg-e2e-testing',
				port: 5432,
				username: 'postgres',
				password: '123',
			})
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(result.status, 401);
	} catch (e) {
		console.error('Test error:', e);
		throw e;
	}
});
