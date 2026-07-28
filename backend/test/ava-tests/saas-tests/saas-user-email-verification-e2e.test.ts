import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ApplicationModule } from '../../../src/app.module.js';
import { BaseType } from '../../../src/common/data-injection.tokens.js';
import { EmailVerificationEntity } from '../../../src/entities/email/email-verification.entity.js';
import { emailVerificationRepositoryExtension } from '../../../src/entities/email/repository/email-verification-custom-repository-extension.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { UserEntity } from '../../../src/entities/user/user.entity.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';

// Tests for the SaaS email-verification bridge POST /saas/user/email/verify/:verificationString
// (SaaSAuthMiddleware / microservice JWT) and the optional `emailVerificationLinkBase` field of
// POST /saas/user/register. rocketadmin-saas routes SiteNova confirmation links through itself
// (GET /saas/user/email/verify/:token) and consumes them via this internal endpoint — the public
// browser route GET /user/email/verify/:slug is unaffected.

let app: INestApplication;
let currentTest: string;
let _testUtils: TestUtils;

// A microservice JWT identical in shape to the one rocketadmin-saas signs (payload { request_id }).
function microserviceAuthHeader(): string {
	const token = jwt.sign({ request_id: faker.string.uuid() }, appConfig.auth.microserviceJwtSecret);
	return `Bearer ${token}`;
}

function buildRegistrationBody(extraFields: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		email: `${faker.lorem.word()}_${faker.string.alphanumeric(6)}_${faker.internet.email()}`.toLowerCase(),
		password: `#r@dY^e&7R4b5Ib@31iE4xbn`,
		name: faker.person.firstName(),
		companyId: faker.string.uuid(),
		companyName: faker.company.name(),
		gclidValue: null,
		...extraFields,
	};
}

async function registerUser(extraFields: Record<string, unknown> = {}): Promise<{ userId: string; email: string }> {
	const body = buildRegistrationBody(extraFields);
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
	return { userId: ro.id, email: ro.email };
}

// The raw token is (correctly) never returned by the register endpoint — replace the verification
// row through the same repository extension the production code uses and keep the fresh raw token.
async function mintVerificationToken(userId: string): Promise<string> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const emailVerificationRepository = dataSource
		.getRepository(EmailVerificationEntity)
		.extend(emailVerificationRepositoryExtension);
	const user = await userRepository.findOne({
		where: { id: userId },
		relations: { email_verification: true },
	});
	const { rawToken } = await emailVerificationRepository.createOrUpdateEmailVerification(user);
	return rawToken;
}

async function findUser(userId: string): Promise<UserEntity | null> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	return await dataSource.getRepository(UserEntity).findOne({
		where: { id: userId },
		relations: { email_verification: true },
	});
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

currentTest = 'POST /saas/user/register (emailVerificationLinkBase)';

test.serial(`${currentTest} accepts an allowed link base and registers the user inactive`, async (t) => {
	const result = await request(app.getHttpServer())
		.post('/saas/user/register')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send(buildRegistrationBody({ emailVerificationLinkBase: 'https://app.sitenova.com/saas/user/email/verify' }));

	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.isActive, false);
	t.pass();
});

test.serial(`${currentTest} tolerates malformed and disallowed link bases (falls back to legacy link)`, async (t) => {
	for (const emailVerificationLinkBase of [
		'not a url at all',
		'ftp://app.sitenova.com/saas/user/email/verify',
		'https://evil.example.com/steal',
		'https://app.sitenova.com/x?query=1',
	]) {
		const result = await request(app.getHttpServer())
			.post('/saas/user/register')
			.set('Authorization', microserviceAuthHeader())
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json')
			.send(buildRegistrationBody({ emailVerificationLinkBase }));

		t.is(result.status, 201, `registration must not fail for link base "${emailVerificationLinkBase}"`);
	}
	t.pass();
});

currentTest = 'POST /saas/user/email/verify/:verificationString';

test.serial(`${currentTest} activates the user and consumes the token`, async (t) => {
	const { userId } = await registerUser();
	const rawToken = await mintVerificationToken(userId);

	const result = await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');

	t.is(result.status, 201);

	const user = await findUser(userId);
	t.is(user.isActive, true);
	t.is(user.email_verification, null);

	// the token is single-use
	const secondResult = await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');
	t.is(secondResult.status, 400);
	t.pass();
});

test.serial(`${currentTest} rejects an unknown token`, async (t) => {
	const { userId } = await registerUser();
	await mintVerificationToken(userId);

	const result = await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${'a'.repeat(40)}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	const user = await findUser(userId);
	t.is(user.isActive, false);
	t.pass();
});

test.serial(`${currentTest} rejects a malformed token`, async (t) => {
	const result = await request(app.getHttpServer())
		.post(`/saas/user/email/verify/${encodeURIComponent('not$a%valid*token!')}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	t.pass();
});

test.serial(`${currentTest} rejects a request without a microservice JWT`, async (t) => {
	const { userId } = await registerUser();
	const rawToken = await mintVerificationToken(userId);

	const result = await request(app.getHttpServer()).post(`/saas/user/email/verify/${rawToken}`);

	t.is(result.status, 401);
	const user = await findUser(userId);
	t.is(user.isActive, false);
	t.pass();
});
