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
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';

// Plan 15 Phase 2 — trigger inversion on the /saas/* email-flow bridges (microservice JWT):
// with `suppressEmail: true` the bridge skips the send and returns an `emailPayload`
// (raw token + context) instead; without the flag the responses stay exactly as before
// (no `emailPayload` field anywhere — backward compatible with old SaaS deployments).

let app: INestApplication;
let currentTest: string;
let _testUtils: TestUtils;

const STRONG_PASSWORD = `#r@dY^e&7R4b5Ib@31iE4xbn`;

function microserviceAuthHeader(): string {
	const token = jwt.sign({ request_id: faker.string.uuid() }, appConfig.auth.microserviceJwtSecret);
	return `Bearer ${token}`;
}

function randomEmail(): string {
	return `${faker.lorem.word()}_${faker.string.alphanumeric(6)}_${faker.internet.email()}`.toLowerCase();
}

async function registerUser(suppressEmail = false): Promise<{
	userId: string;
	email: string;
	companyId: string;
	responseBody: Record<string, any>;
}> {
	const body: Record<string, unknown> = {
		email: randomEmail(),
		password: STRONG_PASSWORD,
		name: faker.person.firstName(),
		companyId: faker.string.uuid(),
		companyName: faker.company.name(),
		gclidValue: null,
	};
	if (suppressEmail) {
		body.suppressEmail = true;
	}
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
	return { userId: ro.id, email: ro.email, companyId: body.companyId as string, responseBody: ro };
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

currentTest = 'POST /saas/user/register (suppressEmail)';

test.serial(`${currentTest} returns an email_confirmation payload whose raw token verifies`, async (t) => {
	const { email, responseBody } = await registerUser(true);

	t.truthy(responseBody.emailPayload);
	t.is(responseBody.emailPayload.type, 'email_confirmation');
	t.is(responseBody.emailPayload.to, email);
	t.is(typeof responseBody.emailPayload.rawToken, 'string');
	t.true(responseBody.emailPayload.rawToken.length > 0);

	// the returned raw token must actually work against the verify bridge
	const verifyResult = await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${responseBody.emailPayload.rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({});
	t.is(verifyResult.status, 201);
	t.pass();
});

test.serial(`${currentTest} without the flag keeps today's response (no emailPayload field)`, async (t) => {
	const { responseBody } = await registerUser(false);
	t.false('emailPayload' in responseBody);
	t.pass();
});

currentTest = 'POST /saas/user/email/verify/request (suppressEmail)';

test.serial(`${currentTest} returns the payload with the flag and none without`, async (t) => {
	const { userId, email } = await registerUser();

	const suppressed = await request(app.getHttpServer())
		.post('/saas/user/email/verify/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, suppressEmail: true });
	t.is(suppressed.status, 201);
	const suppressedRO = JSON.parse(suppressed.text);
	t.is(typeof suppressedRO.message, 'string');
	t.truthy(suppressedRO.emailPayload);
	t.is(suppressedRO.emailPayload.type, 'email_confirmation');
	t.is(suppressedRO.emailPayload.to, email);
	t.is(typeof suppressedRO.emailPayload.rawToken, 'string');

	// the raw token from the re-send payload must verify the email
	const verifyResult = await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${suppressedRO.emailPayload.rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({});
	t.is(verifyResult.status, 201);

	// backward-compat check needs a fresh inactive user (the previous one is now active)
	const { userId: legacyUserId } = await registerUser();
	const legacy = await request(app.getHttpServer())
		.post('/saas/user/email/verify/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId: legacyUserId });
	t.is(legacy.status, 201);
	t.false('emailPayload' in JSON.parse(legacy.text));
	t.pass();
});

currentTest = 'POST /saas/user/password/reset/request (suppressEmail)';

test.serial(
	`${currentTest} existing user gets a payload; unknown user gets the same message, no payload`,
	async (t) => {
		const { email, companyId } = await registerUser();

		const existing = await request(app.getHttpServer())
			.post('/saas/user/password/reset/request')
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.send({ email, companyId, suppressEmail: true });
		t.is(existing.status, 201);
		const existingRO = JSON.parse(existing.text);
		t.truthy(existingRO.emailPayload);
		t.is(existingRO.emailPayload.type, 'password_reset_request');
		t.is(existingRO.emailPayload.to, email);
		t.is(typeof existingRO.emailPayload.rawToken, 'string');

		const missing = await request(app.getHttpServer())
			.post('/saas/user/password/reset/request')
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.send({ email: `nobody_${faker.string.alphanumeric(8)}@example.com`, companyId, suppressEmail: true });
		t.is(missing.status, 201);
		const missingRO = JSON.parse(missing.text);
		// user-enumeration guard: identical message, no payload, no error
		t.is(missingRO.message, existingRO.message);
		t.false('emailPayload' in missingRO);

		// the payload's raw token must consume via the reset-verify bridge
		const verifyResult = await request(app.getHttpServer())
			.post(`/saas/user/password/reset/verify/${existingRO.emailPayload.rawToken}`)
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.send({ password: `N3w!${STRONG_PASSWORD}` });
		t.is(verifyResult.status, 201);
		t.pass();
	},
);

test.serial(`${currentTest} without the flag keeps today's behavior (403 for unknown user, no payload)`, async (t) => {
	const { email, companyId } = await registerUser();

	const legacy = await request(app.getHttpServer())
		.post('/saas/user/password/reset/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email, companyId });
	t.is(legacy.status, 201);
	t.false('emailPayload' in JSON.parse(legacy.text));

	const legacyMissing = await request(app.getHttpServer())
		.post('/saas/user/password/reset/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email: `nobody_${faker.string.alphanumeric(8)}@example.com`, companyId: faker.string.uuid() });
	t.is(legacyMissing.status, 403);
	t.pass();
});

currentTest = 'POST /saas/user/email/change/request + verify (suppressEmail)';

test.serial(`${currentTest} returns payloads on both legs and the raw token works`, async (t) => {
	const { userId, email } = await registerUser(true);

	// activate through the suppressed-registration raw token (email + token state live in the core)
	const registerPayloadToken = (
		await request(app.getHttpServer())
			.post('/saas/user/email/verify/request')
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.send({ userId, suppressEmail: true })
	).body.emailPayload.rawToken;
	await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${registerPayloadToken}`)
		.set('Authorization', microserviceAuthHeader())
		.send({});

	const changeRequest = await request(app.getHttpServer())
		.post('/saas/user/email/change/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, suppressEmail: true });
	t.is(changeRequest.status, 201);
	const changeRequestRO = JSON.parse(changeRequest.text);
	t.truthy(changeRequestRO.emailPayload);
	t.is(changeRequestRO.emailPayload.type, 'email_change_request');
	t.is(changeRequestRO.emailPayload.to, email);
	t.is(typeof changeRequestRO.emailPayload.rawToken, 'string');

	const newEmail = `changed_${faker.string.alphanumeric(8)}@example.com`.toLowerCase();
	const verify = await request(app.getHttpServer())
		.post(`/saas/user/email/change/verify/${changeRequestRO.emailPayload.rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email: newEmail, suppressEmail: true });
	t.is(verify.status, 201);
	const verifyRO = JSON.parse(verify.text);
	t.truthy(verifyRO.emailPayload);
	t.is(verifyRO.emailPayload.type, 'email_changed');
	t.is(verifyRO.emailPayload.to, newEmail);
	t.false('rawToken' in verifyRO.emailPayload);
	t.pass();
});

test.serial(`${currentTest} without the flag returns no payloads`, async (t) => {
	const { userId } = await registerUser(true);
	const activateToken = (
		await request(app.getHttpServer())
			.post('/saas/user/email/verify/request')
			.set('Authorization', microserviceAuthHeader())
			.send({ userId, suppressEmail: true })
	).body.emailPayload.rawToken;
	await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${activateToken}`)
		.set('Authorization', microserviceAuthHeader())
		.send({});

	const changeRequest = await request(app.getHttpServer())
		.post('/saas/user/email/change/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId });
	t.is(changeRequest.status, 201);
	t.false('emailPayload' in JSON.parse(changeRequest.text));
	t.pass();
});

currentTest = 'POST /saas/company/:companyId/invite (suppressEmail)';

test.serial(`${currentTest} returns a company_invite payload with company context`, async (t) => {
	const { userId, companyId } = await registerUser();
	const invitedEmail = `invited_${faker.string.alphanumeric(8)}@example.com`.toLowerCase();

	const result = await request(app.getHttpServer())
		.post(`/saas/company/${companyId}/invite`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({
			inviterId: userId,
			email: invitedEmail,
			role: 'USER',
			suppressEmail: true,
		});

	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.email, invitedEmail);
	t.is(ro.companyId, companyId);
	t.truthy(ro.emailPayload);
	t.is(ro.emailPayload.type, 'company_invite');
	t.is(ro.emailPayload.to, invitedEmail);
	t.is(ro.emailPayload.companyId, companyId);
	t.is(typeof ro.emailPayload.rawToken, 'string');
	t.is(typeof ro.emailPayload.companyName, 'string');
	// the raw token in the payload is the invitation token (same one surfaced under test env)
	t.is(ro.emailPayload.rawToken, ro.verificationString);
	t.pass();
});

test.serial(`${currentTest} existing-inactive user branch returns a marked success with the payload`, async (t) => {
	const { userId, companyId } = await registerUser();
	// second (still inactive) user in the same company
	const inactive = await request(app.getHttpServer())
		.post('/saas/user/register')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({
			email: randomEmail(),
			password: STRONG_PASSWORD,
			name: faker.person.firstName(),
			companyId,
			companyName: faker.company.name(),
			gclidValue: null,
			suppressEmail: true,
		});
	t.is(inactive.status, 201);
	const inactiveRO = JSON.parse(inactive.text);

	const result = await request(app.getHttpServer())
		.post(`/saas/company/${companyId}/invite`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({
			inviterId: userId,
			email: inactiveRO.email,
			role: 'USER',
			suppressEmail: true,
		});

	// Marked success, NOT a 400: the global exception filter serializes a fixed error shape and
	// would strip the payload, so the bridge returns `userAlreadyAddedInactive` and the SaaS
	// caller surfaces the user-facing 400 itself.
	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.userAlreadyAddedInactive, true);
	t.truthy(ro.emailPayload);
	t.is(ro.emailPayload.type, 'email_confirmation');
	t.is(ro.emailPayload.to, inactiveRO.email);
	t.is(typeof ro.emailPayload.rawToken, 'string');

	// the re-confirmation token must verify the inactive user's email
	const verifyResult = await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${ro.emailPayload.rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.send({});
	t.is(verifyResult.status, 201);
	t.pass();
});

test.serial(`${currentTest} without the flag returns no payload (backward compat)`, async (t) => {
	const { userId, companyId } = await registerUser();
	const invitedEmail = `invited_${faker.string.alphanumeric(8)}@example.com`.toLowerCase();

	const result = await request(app.getHttpServer())
		.post(`/saas/company/${companyId}/invite`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({
			inviterId: userId,
			email: invitedEmail,
			role: 'USER',
		});

	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.false('emailPayload' in ro);
	t.pass();
});

currentTest = 'public routes never honor suppressEmail';

test.serial(`${currentTest} POST /user/password/reset/request/ ignores a smuggled flag`, async (t) => {
	const { email, companyId } = await registerUser();

	// The public (non-bridge) route must never return a raw token, whatever the body says.
	const result = await request(app.getHttpServer())
		.post('/user/password/reset/request/')
		.set('Content-Type', 'application/json')
		.send({ email, companyId, suppressEmail: true });

	t.is(result.status, 201);
	t.false('emailPayload' in JSON.parse(result.text));
	t.pass();
});
