/* eslint-disable @typescript-eslint/no-unused-vars */

import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { Constants } from '../../../src/helpers/constants/constants.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let currentTest: string;

const testPassword = `#r@dY^e&7R4b5Ib@31iE4xbn`;

// SelfHostedOperationsModule.register() decides at IMPORT time (when
// app.module loads) whether to build the full self-hosted variant — flipping
// IS_SAAS afterwards cannot bring the routes back. In SaaS-mode environments
// (e.g. the sitenova full stack, IS_SAAS=true in the container env) this file
// can only self-skip; it runs for real where the env is self-hosted at import
// (rocketadmin CI), or via `exec -e IS_SAAS= … npx ava <this file>`.
const SELFHOSTED_MODULE_UNAVAILABLE = !!process.env.IS_SAAS;

function skipUnavailable(t: { log: (msg: string) => void; pass: () => void }): boolean {
	if (SELFHOSTED_MODULE_UNAVAILABLE) {
		t.log('skipped: selfhosted module unavailable (IS_SAAS was set when the app module was imported)');
		t.pass();
		return true;
	}
	return false;
}

test.beforeEach(async () => {
	if (SELFHOSTED_MODULE_UNAVAILABLE) {
		return;
	}
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService],
	}).compile();
	app = moduleFixture.createNestApplication();
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

test.afterEach(async () => {
	setSaasEnvVariable();
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

async function getUserProfile(userToken: string): Promise<{ id: string; email: string; company: { id: string } }> {
	const foundUser = await request(app.getHttpServer())
		.get('/user/')
		.set('Cookie', userToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return JSON.parse(foundUser.text);
}

// Self-hosted invite flow (plan 15 Phase 6): no email transporter exists or is reachable —
// the invitation must still succeed (dispatchEmail no-ops), the raw verification string is
// exposed under isTest(), and the invited user can complete signup and log in.
async function inviteAndActivateUser(
	adminToken: string,
	role: 'ADMIN' | 'USER' = 'USER',
): Promise<{ userId: string; email: string; password: string; token: string }> {
	const adminProfile = await getUserProfile(adminToken);
	const email = `${faker.lorem.words(1)}_${faker.internet.email()}`.toLowerCase();

	const invitationResult = await request(app.getHttpServer())
		.put(`/company/user/${adminProfile.company.id}`)
		.send({ companyId: adminProfile.company.id, email, role, groupId: undefined })
		.set('Cookie', adminToken)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	if (invitationResult.status > 201) {
		throw new Error(`Invitation failed: ${invitationResult.text}`);
	}
	const invitationRO = JSON.parse(invitationResult.text);

	const verificationResult = await request(app.getHttpServer())
		.post(`/company/invite/verify/${invitationRO.verificationString}`)
		.send({ password: testPassword, userName: email })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	if (verificationResult.status > 201) {
		throw new Error(`Invite verification failed: ${verificationResult.text}`);
	}
	const token = `${Constants.JWT_COOKIE_KEY_NAME}=${TestUtils.getJwtTokenFromResponse(verificationResult)}`;
	const profile = await getUserProfile(token);
	return { userId: profile.id, email, password: testPassword, token };
}

async function loginUser(email: string, password: string): Promise<request.Response> {
	return await request(app.getHttpServer())
		.post('/user/login/')
		.send({ email, password })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

currentTest = 'self-hosted invite flow without email';

test.serial(`${currentTest} invite succeeds with no email transporter and invited user can log in`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);

	// The whole flow must work although no SMTP transporter is configured or reachable:
	// plan 15 Phase 3 dispatchEmail never touches a transporter, and Phase 6 removed the
	// fatal EMAIL_SEND_FAILED check from the invite use case.
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');
	t.truthy(invitedUser.userId);

	const loginResult = await loginUser(invitedUser.email, invitedUser.password);
	t.is(loginResult.status, 201);
});

test.serial(`${currentTest} re-inviting an inactive user does not fail with email send error`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const adminProfile = await getUserProfile(adminInfo.token);
	const email = `${faker.lorem.words(1)}_${faker.internet.email()}`.toLowerCase();

	const firstInvite = await request(app.getHttpServer())
		.put(`/company/user/${adminProfile.company.id}`)
		.send({ companyId: adminProfile.company.id, email, role: 'USER', groupId: undefined })
		.set('Cookie', adminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.true(firstInvite.status <= 201);

	// Second invite of the same not-yet-active email: before plan 15 Phase 6 this path
	// attempted an email send and threw a fatal 500 EMAIL_SEND_FAILED self-hosted.
	// Now it must answer with the domain-level 400 (user already added but not active).
	const secondInvite = await request(app.getHttpServer())
		.put(`/company/user/${adminProfile.company.id}`)
		.send({ companyId: adminProfile.company.id, email, role: 'USER', groupId: undefined })
		.set('Cookie', adminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.not(secondInvite.status, 500);
});

currentTest = 'PUT /selfhosted/users/:userId/password';

test.serial(`${currentTest} admin sets a new password: old rejected, new accepted`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');
	const newPassword = `New_${faker.internet.password({ length: 16 })}1A`;

	const setPasswordResult = await request(app.getHttpServer())
		.put(`/selfhosted/users/${invitedUser.userId}/password`)
		.send({ newPassword })
		.set('Cookie', adminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(setPasswordResult.status, 200);
	t.is(JSON.parse(setPasswordResult.text).success, true);

	const oldPasswordLogin = await loginUser(invitedUser.email, invitedUser.password);
	t.true(oldPasswordLogin.status >= 400);

	const newPasswordLogin = await loginUser(invitedUser.email, newPassword);
	t.is(newPasswordLogin.status, 201);
});

test.serial(`${currentTest} non-admin user receives 403`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const adminProfile = await getUserProfile(adminInfo.token);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');

	const result = await request(app.getHttpServer())
		.put(`/selfhosted/users/${adminProfile.id}/password`)
		.send({ newPassword: `New_${faker.internet.password({ length: 16 })}1A` })
		.set('Cookie', invitedUser.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(result.status, 403);
});

test.serial(`${currentTest} request without cookie receives 401`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const result = await request(app.getHttpServer())
		.put(`/selfhosted/users/${faker.string.uuid()}/password`)
		.send({ newPassword: `New_${faker.internet.password({ length: 16 })}1A` })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(result.status, 401);
});

test.serial(`${currentTest} weak (too short) password receives 400`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');

	// isPasswordStrongOrThrowError is bypassed in test mode — the DTO MinLength(8)
	// still enforces the lower bound, so a short password must be rejected.
	const result = await request(app.getHttpServer())
		.put(`/selfhosted/users/${invitedUser.userId}/password`)
		.send({ newPassword: 'short' })
		.set('Cookie', adminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(result.status, 400);
});

test.serial(`${currentTest} admin of another company receives 404`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');
	const foreignAdminInfo = await registerUserAndReturnUserInfo(app);

	const result = await request(app.getHttpServer())
		.put(`/selfhosted/users/${invitedUser.userId}/password`)
		.send({ newPassword: `New_${faker.internet.password({ length: 16 })}1A` })
		.set('Cookie', foreignAdminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(result.status, 404);
});

currentTest = 'PUT /selfhosted/users/:userId/email';

test.serial(`${currentTest} admin updates user email and user can log in with it`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');
	const newEmail = `${faker.lorem.words(1)}_${faker.internet.email()}`.toLowerCase();

	const result = await request(app.getHttpServer())
		.put(`/selfhosted/users/${invitedUser.userId}/email`)
		.send({ newEmail })
		.set('Cookie', adminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(result.status, 200);
	t.is(JSON.parse(result.text).success, true);

	const oldEmailLogin = await loginUser(invitedUser.email, invitedUser.password);
	t.true(oldEmailLogin.status >= 400);

	const newEmailLogin = await loginUser(newEmail, invitedUser.password);
	t.is(newEmailLogin.status, 201);
});

test.serial(`${currentTest} taken email receives 400 with uniqueness message`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');

	const result = await request(app.getHttpServer())
		.put(`/selfhosted/users/${invitedUser.userId}/email`)
		.send({ newEmail: adminInfo.email })
		.set('Cookie', adminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(result.status, 400);
	t.is(JSON.parse(result.text).message, Messages.CANNOT_SET_THIS_EMAIL);
});

test.serial(`${currentTest} malformed email receives 400`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');

	const result = await request(app.getHttpServer())
		.put(`/selfhosted/users/${invitedUser.userId}/email`)
		.send({ newEmail: 'not-an-email' })
		.set('Cookie', adminInfo.token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(result.status, 400);
});

currentTest = 'SaaS mode gating';

// The real SaaS deployment registers an EMPTY SelfHostedOperationsModule (register() runs
// with IS_SAAS set), so the routes plainly 404 there — that branch cannot be exercised
// in-process because register() already ran self-hosted at module import. What CAN be
// verified is the dynamic belt-and-braces gate inside the use cases: with IS_SAAS flipped
// at request time the endpoints answer 400 ENDPOINT_NOT_AVAILABLE_IN_THIS_MODE.
test.serial(`${currentTest} user-admin routes answer 400 when IS_SAAS is set`, async (t) => {
	if (skipUnavailable(t)) {
		return;
	}
	const adminInfo = await registerUserAndReturnUserInfo(app);
	const invitedUser = await inviteAndActivateUser(adminInfo.token, 'USER');

	setSaasEnvVariable(true);
	try {
		const passwordResult = await request(app.getHttpServer())
			.put(`/selfhosted/users/${invitedUser.userId}/password`)
			.send({ newPassword: `New_${faker.internet.password({ length: 16 })}1A` })
			.set('Cookie', adminInfo.token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(passwordResult.status, 400);
		t.is(JSON.parse(passwordResult.text).message, Messages.ENDPOINT_NOT_AVAILABLE_IN_THIS_MODE);

		const emailResult = await request(app.getHttpServer())
			.put(`/selfhosted/users/${invitedUser.userId}/email`)
			.send({ newEmail: `${faker.lorem.words(1)}_${faker.internet.email()}`.toLowerCase() })
			.set('Cookie', adminInfo.token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(emailResult.status, 400);
		t.is(JSON.parse(emailResult.text).message, Messages.ENDPOINT_NOT_AVAILABLE_IN_THIS_MODE);
	} finally {
		setSaasEnvVariable();
	}
});
