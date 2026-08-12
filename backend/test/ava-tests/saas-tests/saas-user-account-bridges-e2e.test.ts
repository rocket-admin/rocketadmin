import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { generateSync } from 'otplib';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ApplicationModule } from '../../../src/app.module.js';
import { BaseType } from '../../../src/common/data-injection.tokens.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { UserEntity } from '../../../src/entities/user/user.entity.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';

// Tests for the plan-15 Phase 4/5 internal user-account bridges rocketadmin-saas calls
// (microservice JWT):
//   GET  /saas/user/:userId/profile          POST /saas/user/password/change
//   PUT  /saas/user/name                     PUT  /saas/user/delete
//   POST /saas/user/settings                 GET  /saas/user/:userId/settings
//   PUT  /saas/user/test-connections
//   POST /saas/user/otp/generate|verify|disable|login
//   POST /saas/user/validate-token (allowScopes extension)
// The OTP codes are computed with the same otplib the core verifies with; the temporary token for
// otp/login is minted exactly the way the saas service signs it (TEMPORARY_JWT_SECRET, `id` claim).

let app: INestApplication;
let currentTest: string;
let _testUtils: TestUtils;

const STRONG_PASSWORD = `#r@dY^e&7R4b5Ib@31iE4xbn`;

function microserviceAuthHeader(): string {
	const token = jwt.sign({ request_id: faker.string.uuid() }, appConfig.auth.microserviceJwtSecret);
	return `Bearer ${token}`;
}

async function registerUser(): Promise<{ userId: string; email: string; companyId: string }> {
	const body = {
		email: `${faker.lorem.word()}_${faker.string.alphanumeric(6)}_${faker.internet.email()}`.toLowerCase(),
		password: STRONG_PASSWORD,
		name: faker.person.firstName(),
		companyId: faker.string.uuid(),
		companyName: faker.company.name(),
		gclidValue: null,
	};
	const result = await request(app.getHttpServer())
		.post('/saas/user/register')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send(body);
	if (result.status !== 201) {
		throw new Error(`Test user registration failed: ${result.status} ${result.text}`);
	}
	const ro = JSON.parse(result.text);
	return { userId: ro.id, email: ro.email, companyId: body.companyId };
}

async function activateUser(userId: string): Promise<void> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const user = await userRepository.findOne({ where: { id: userId } });
	user.isActive = true;
	await userRepository.save(user);
}

async function getProfile(userId: string): Promise<request.Response> {
	return await request(app.getHttpServer())
		.get(`/saas/user/${userId}/profile`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');
}

// Enrols the user into 2FA through the bridges and returns the shared TOTP secret.
async function enrollUserIntoOtp(userId: string): Promise<string> {
	await activateUser(userId);
	const generateResult = await request(app.getHttpServer())
		.post('/saas/user/otp/generate')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId });
	if (generateResult.status !== 201) {
		throw new Error(`OTP generation failed: ${generateResult.status} ${generateResult.text}`);
	}
	const { otpauth_url } = JSON.parse(generateResult.text);
	const secret = new URL(otpauth_url).searchParams.get('secret');
	if (!secret) {
		throw new Error(`No secret in otpauth url: ${otpauth_url}`);
	}
	const verifyResult = await request(app.getHttpServer())
		.post('/saas/user/otp/verify')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, otpCode: generateSync({ secret }) });
	if (verifyResult.status !== 201) {
		throw new Error(`OTP verification failed: ${verifyResult.status} ${verifyResult.text}`);
	}
	return secret;
}

// Mints the 4-minute temporary token exactly the way the saas service does at the password step
// of a 2FA login (generateTemporaryJwtToken: `id` + `email` claims, TEMPORARY_JWT_SECRET).
function mintTemporaryToken(userId: string, email: string): string {
	const exp = Math.floor(Date.now() / 1000) + 60 * 4;
	return jwt.sign({ id: userId, email, exp }, appConfig.auth.temporaryJwtSecret);
}

test.before(async () => {
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

currentTest = 'GET /saas/user/:userId/profile';

test.serial(`${currentTest} returns the full FoundUserDto shape (findMe parity)`, async (t) => {
	const { userId, email, companyId } = await registerUser();

	const result = await getProfile(userId);
	t.is(result.status, 200);
	const ro = JSON.parse(result.text);
	t.is(ro.id, userId);
	t.is(ro.email, email);
	t.is(ro.isActive, false);
	t.is(ro.suspended, false);
	t.is(ro.is_2fa_enabled, false);
	t.is(ro.show_test_connections, true);
	t.is(typeof ro.role, 'string');
	t.is(Object.hasOwn(ro, 'createdAt'), true);
	t.is(Object.hasOwn(ro, 'externalRegistrationProvider'), true);
	t.is(ro.company.id, companyId);
	t.pass();
});

test.serial(`${currentTest} rejects an unknown user`, async (t) => {
	const result = await getProfile(faker.string.uuid());
	t.is(result.status, 404);
	t.pass();
});

currentTest = 'POST /saas/user/password/change';

test.serial(`${currentTest} rejects a wrong old password and accepts the right one`, async (t) => {
	const { userId, email, companyId } = await registerUser();
	const newPassword = `N3w!${STRONG_PASSWORD}`;

	const wrongResult = await request(app.getHttpServer())
		.post('/saas/user/password/change')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, email, oldPassword: `wrong_${STRONG_PASSWORD}`, newPassword });
	t.is(wrongResult.status, 400);

	const result = await request(app.getHttpServer())
		.post('/saas/user/password/change')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, email, oldPassword: STRONG_PASSWORD, newPassword });
	t.is(result.status, 201);

	// the login bridge accepts the new password and rejects the old one
	const newPasswordLogin = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email, password: newPassword, companyId, request_domain: '127.0.0.1' });
	t.is(newPasswordLogin.status, 201);

	const oldPasswordLogin = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email, password: STRONG_PASSWORD, companyId, request_domain: '127.0.0.1' });
	t.is(oldPasswordLogin.status, 400);
	t.pass();
});

currentTest = 'PUT /saas/user/name';

test.serial(`${currentTest} changes the name (reflected in the profile)`, async (t) => {
	const { userId } = await registerUser();
	const newName = `Renamed_${faker.string.alphanumeric(6)}`;

	const result = await request(app.getHttpServer())
		.put('/saas/user/name')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, name: newName });
	t.is(result.status, 200);
	t.is(JSON.parse(result.text).name, newName);

	const profileResult = await getProfile(userId);
	t.is(JSON.parse(profileResult.text).name, newName);
	t.pass();
});

currentTest = 'POST /saas/user/settings + GET /saas/user/:userId/settings';

test.serial(`${currentTest} roundtrips the settings`, async (t) => {
	const { userId } = await registerUser();
	const userSettings = JSON.stringify({ theme: 'dark', tableWidth: 42 });

	const saveResult = await request(app.getHttpServer())
		.post('/saas/user/settings')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, userSettings });
	t.is(saveResult.status, 201);
	const savedRO = JSON.parse(saveResult.text);
	t.is(savedRO.userId, userId);

	const getResult = await request(app.getHttpServer())
		.get(`/saas/user/${userId}/settings`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');
	t.is(getResult.status, 200);
	const gotRO = JSON.parse(getResult.text);
	t.is(gotRO.userId, userId);
	t.deepEqual(JSON.parse(gotRO.userSettings), JSON.parse(userSettings));
	t.pass();
});

test.serial(`${currentTest} rejects a non-JSON settings string`, async (t) => {
	const { userId } = await registerUser();
	const result = await request(app.getHttpServer())
		.post('/saas/user/settings')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, userSettings: 'not json at all' });
	t.is(result.status, 400);
	t.pass();
});

currentTest = 'PUT /saas/user/test-connections';

test.serial(`${currentTest} toggles the display mode (reflected in the profile)`, async (t) => {
	const { userId } = await registerUser();

	const offResult = await request(app.getHttpServer())
		.put('/saas/user/test-connections')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, displayMode: 'off' });
	t.is(offResult.status, 200);
	t.is(JSON.parse(offResult.text).success, true);
	t.is(JSON.parse((await getProfile(userId)).text).show_test_connections, false);

	const onResult = await request(app.getHttpServer())
		.put('/saas/user/test-connections')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, displayMode: 'on' });
	t.is(onResult.status, 200);
	t.is(JSON.parse((await getProfile(userId)).text).show_test_connections, true);
	t.pass();
});

test.serial(`${currentTest} rejects an invalid display mode`, async (t) => {
	const { userId } = await registerUser();
	const result = await request(app.getHttpServer())
		.put('/saas/user/test-connections')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, displayMode: 'maybe' });
	t.is(result.status, 400);
	t.pass();
});

currentTest = 'POST /saas/user/otp/generate + /saas/user/otp/verify';

test.serial(`${currentTest} enrols with a computed TOTP code`, async (t) => {
	const { userId } = await registerUser();
	await activateUser(userId);

	const generateResult = await request(app.getHttpServer())
		.post('/saas/user/otp/generate')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId });
	t.is(generateResult.status, 201);
	const generateRO = JSON.parse(generateResult.text);
	t.is(typeof generateRO.otpauth_url, 'string');
	t.is(typeof generateRO.qrCode, 'string');
	const secret = new URL(generateRO.otpauth_url).searchParams.get('secret');
	t.truthy(secret);

	const wrongResult = await request(app.getHttpServer())
		.post('/saas/user/otp/verify')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, otpCode: '000000' });
	t.true(wrongResult.status >= 400);
	t.is(JSON.parse((await getProfile(userId)).text).is_2fa_enabled, false);

	const verifyResult = await request(app.getHttpServer())
		.post('/saas/user/otp/verify')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, otpCode: generateSync({ secret }) });
	t.is(verifyResult.status, 201);
	t.is(JSON.parse(verifyResult.text).validated, true);
	t.is(JSON.parse((await getProfile(userId)).text).is_2fa_enabled, true);
	t.pass();
});

test.serial(`${currentTest} rejects generation for an inactive user`, async (t) => {
	const { userId } = await registerUser();
	const result = await request(app.getHttpServer())
		.post('/saas/user/otp/generate')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId });
	t.is(result.status, 400);
	t.pass();
});

currentTest = 'POST /saas/user/otp/login';

test.serial(`${currentTest} completes a 2FA login with a temporary token + TOTP code`, async (t) => {
	const { userId, email } = await registerUser();
	const secret = await enrollUserIntoOtp(userId);
	const temporaryToken = mintTemporaryToken(userId, email);

	const result = await request(app.getHttpServer())
		.post('/saas/user/otp/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ temporaryToken, otpCode: generateSync({ secret }) });
	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.id, userId);
	t.is(ro.email, email);
	t.is(ro.is_2fa_enabled, true);
	t.pass();
});

test.serial(`${currentTest} rejects a wrong OTP code`, async (t) => {
	const { userId, email } = await registerUser();
	await enrollUserIntoOtp(userId);
	const temporaryToken = mintTemporaryToken(userId, email);

	const result = await request(app.getHttpServer())
		.post('/saas/user/otp/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ temporaryToken, otpCode: '000000' });
	t.is(result.status, 400);
	t.pass();
});

test.serial(`${currentTest} rejects a token signed with the wrong secret`, async (t) => {
	const { userId, email } = await registerUser();
	const secret = await enrollUserIntoOtp(userId);
	// A FULL session token (JWT_SECRET) must not pass the temporary-token check.
	const exp = Math.floor(Date.now() / 1000) + 60 * 4;
	const wrongToken = jwt.sign({ id: userId, email, exp }, appConfig.auth.jwtSecret);

	const result = await request(app.getHttpServer())
		.post('/saas/user/otp/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ temporaryToken: wrongToken, otpCode: generateSync({ secret }) });
	t.is(result.status, 401);
	t.pass();
});

currentTest = 'POST /saas/user/validate-token with allowScopes';

test.serial(`${currentTest} accepts a 2fa_enable-scoped token only when the scope is allowed`, async (t) => {
	const { userId, email } = await registerUser();
	const exp = Math.floor(Date.now() / 1000) + 60 * 60;
	const scopedToken = jwt.sign({ id: userId, email, exp, scope: ['2fa_enable'] }, appConfig.auth.jwtSecret);

	// current strict behavior without the new field: 2FA-required rejection
	const strictResult = await request(app.getHttpServer())
		.post('/saas/user/validate-token')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ token: scopedToken });
	t.is(strictResult.status, 400);

	const allowedResult = await request(app.getHttpServer())
		.post('/saas/user/validate-token')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ token: scopedToken, allowScopes: ['2fa_enable'] });
	t.is(allowedResult.status, 201);
	const ro = JSON.parse(allowedResult.text);
	t.is(ro.sub, userId);
	t.is(ro.email, email);

	// an unscoped token still validates with the field present
	const plainToken = jwt.sign({ id: userId, email, exp }, appConfig.auth.jwtSecret);
	const plainResult = await request(app.getHttpServer())
		.post('/saas/user/validate-token')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ token: plainToken, allowScopes: ['2fa_enable'] });
	t.is(plainResult.status, 201);
	t.pass();
});

currentTest = 'POST /saas/user/otp/disable';

test.serial(`${currentTest} disables 2FA with a valid code`, async (t) => {
	const { userId } = await registerUser();
	const secret = await enrollUserIntoOtp(userId);

	const wrongResult = await request(app.getHttpServer())
		.post('/saas/user/otp/disable')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, otpCode: '000000' });
	t.true(wrongResult.status >= 400);

	const result = await request(app.getHttpServer())
		.post('/saas/user/otp/disable')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, otpCode: generateSync({ secret }) });
	t.is(result.status, 201);
	t.is(JSON.parse(result.text).disabled, true);
	t.is(JSON.parse((await getProfile(userId)).text).is_2fa_enabled, false);
	t.pass();
});

currentTest = 'PUT /saas/user/delete';

test.serial(`${currentTest} deletes the account (profile 404 afterwards)`, async (t) => {
	// Delete a NON-last company member: deleting the last user triggers the
	// core→saas deleteCompany webhook, and bridge-registered test users have no
	// saas-side CompanyEntity, so that call can only fail in this stack. A
	// second bridge registration into the same companyId gives us a deletable
	// non-last member without touching any saas webhook.
	const { userId: firstUserId, companyId } = await registerUser();
	await activateUser(firstUserId);

	const secondBody = {
		email: `${faker.lorem.word()}_${faker.string.alphanumeric(6)}_${faker.internet.email()}`.toLowerCase(),
		password: STRONG_PASSWORD,
		name: faker.person.firstName(),
		companyId,
		companyName: faker.company.name(),
		gclidValue: null,
	};
	const secondRegister = await request(app.getHttpServer())
		.post('/saas/user/register')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send(secondBody);
	t.is(secondRegister.status, 201);
	const secondUserId = JSON.parse(secondRegister.text).id;

	const result = await request(app.getHttpServer())
		.put('/saas/user/delete')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId: secondUserId, reason: 'other', message: 'e2e cleanup' });
	t.is(result.status, 200);
	t.is(JSON.parse(result.text).email, secondBody.email);

	const profileResult = await getProfile(secondUserId);
	t.is(profileResult.status, 404);
	t.pass();
});

currentTest = 'internal user-account endpoints auth';

test.serial(`${currentTest} reject requests without a microservice JWT`, async (t) => {
	const userId = faker.string.uuid();
	const cases: Array<{ method: 'get' | 'post' | 'put'; path: string }> = [
		{ method: 'get', path: `/saas/user/${userId}/profile` },
		{ method: 'post', path: '/saas/user/password/change' },
		{ method: 'put', path: '/saas/user/name' },
		{ method: 'put', path: '/saas/user/delete' },
		{ method: 'post', path: '/saas/user/settings' },
		{ method: 'get', path: `/saas/user/${userId}/settings` },
		{ method: 'put', path: '/saas/user/test-connections' },
		{ method: 'post', path: '/saas/user/otp/generate' },
		{ method: 'post', path: '/saas/user/otp/verify' },
		{ method: 'post', path: '/saas/user/otp/disable' },
		{ method: 'post', path: '/saas/user/otp/login' },
	];
	for (const { method, path } of cases) {
		const result = await request(app.getHttpServer())[method](path).set('Content-Type', 'application/json').send({});
		t.is(result.status, 401, `expected 401 for ${method.toUpperCase()} ${path}`);
	}
	t.pass();
});
