/* eslint-disable @typescript-eslint/no-unused-vars */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { IUserInfo } from '../../../src/entities/user/user.interface.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import {
	registerUserAndReturnUserInfo,
	createInitialTestUser,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let currentTest: string;
let _testUtils: TestUtils;

test.beforeEach(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	app = moduleFixture.createNestApplication();
	_testUtils = moduleFixture.get<TestUtils>(TestUtils);
	// await testUtils.resetDb();
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
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

currentTest = 'GET /user';

test.serial(`${currentTest} should return user info for this user`, async (t) => {
	const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
	const { token } = adminUserRegisterInfo;

	const getUserResult = await request(app.getHttpServer())
		.get('/user')
		.set('Content-Type', 'application/json')
		.set('Cookie', token)
		.set('Accept', 'application/json');
	const getUserRO: IUserInfo = JSON.parse(getUserResult.text);

	t.is(getUserRO.isActive, true);
	t.is(getUserRO.email, adminUserRegisterInfo.email);
	t.is(Object.hasOwn(getUserRO, 'createdAt'), true);
	t.pass();
});

currentTest = 'DELETE /user';

test.serial(`${currentTest} should return user deletion result`, async (t) => {
	const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
	const { token } = adminUserRegisterInfo;

	let getUserResult = await request(app.getHttpServer())
		.get('/user')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(getUserResult.status, 200);
	const deleteUserResult = await request(app.getHttpServer())
		.put('/user/delete/')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const deleteUserRO = JSON.parse(deleteUserResult.text);
	t.is(deleteUserRO.email, adminUserRegisterInfo.email);
	getUserResult = await request(app.getHttpServer())
		.get('/user')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(getUserResult.status, 401);
	t.pass();
});

test.serial(`${currentTest} should return expiration token when user login`, async (t) => {
	const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
	const { email, password } = adminUserRegisterInfo;

	const loginUserResult = await request(app.getHttpServer())
		.post('/user/login/')
		.send({ email, password })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const loginUserRO = JSON.parse(loginUserResult.text);
	t.is(Object.hasOwn(loginUserRO, 'expires'), true);
	t.pass();
});

test.serial(`${currentTest} reject authorization when try to login with wrong password`, async (t) => {
	const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
	const { email, password } = adminUserRegisterInfo;

	const realPassword = password;
	const wrongPassword = 'wrong password';
	const wrongUserLogin = await request(app.getHttpServer())
		.post('/user/login/')
		.send({ email, password: wrongPassword })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(wrongUserLogin.status, 400);

	const loginUserResult = await request(app.getHttpServer())
		.post('/user/login/')
		.send({ email, password: realPassword })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const loginUserRO = JSON.parse(loginUserResult.text);
	t.is(Object.hasOwn(loginUserRO, 'expires'), true);
	t.pass();
});

currentTest = 'GET /user/settings';
test.serial(`${currentTest} should return empty user settings when it was not created`, async (t) => {
	const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
	const { token } = adminUserRegisterInfo;

	const getUserSettingsResult = await request(app.getHttpServer())
		.get('/user/settings')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const getUserSettingsRO = JSON.parse(getUserSettingsResult.text);
	t.is(getUserSettingsResult.status, 200);
	t.is(Object.hasOwn(getUserSettingsRO, 'userSettings'), true);
	t.is(getUserSettingsRO.userSettings, null);
	t.pass();
});

currentTest = 'POST /user/settings';
test.serial(`${currentTest} should return created user settings`, async (t) => {
	const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
	const { token } = adminUserRegisterInfo;

	const settings = JSON.stringify({ test: 'test' });

	const saveUserSettingsResult = await request(app.getHttpServer())
		.post('/user/settings')
		.send({ userSettings: settings })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(saveUserSettingsResult.status, 201);
	const saveUserSettingsRO = JSON.parse(saveUserSettingsResult.text);
	t.is(Object.hasOwn(saveUserSettingsRO, 'userSettings'), true);
	t.is(JSON.parse(saveUserSettingsRO.userSettings).test, 'test');
	t.pass();
});

test.serial(`${currentTest} should return user settings when it was created`, async (t) => {
	const adminUserRegisterInfo = await registerUserAndReturnUserInfo(app);
	const { token } = adminUserRegisterInfo;

	const settings = JSON.stringify({ test: 'test' });

	const saveUserSettingsResult = await request(app.getHttpServer())
		.post('/user/settings')
		.send({ userSettings: settings })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(saveUserSettingsResult.status, 201);

	const getUserSettingsResult = await request(app.getHttpServer())
		.get('/user/settings')
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const getUserSettingsRO = JSON.parse(getUserSettingsResult.text);
	t.is(getUserSettingsResult.status, 200);
	t.is(Object.hasOwn(getUserSettingsRO, 'userSettings'), true);
	t.is(JSON.parse(getUserSettingsRO.userSettings).test, 'test');
	t.pass();
});
