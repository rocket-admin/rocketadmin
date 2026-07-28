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
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { UserEntity } from '../../../src/entities/user/user.entity.js';
import { EmailChangeEntity } from '../../../src/entities/user/user-email/email-change.entity.js';
import { emailChangeCustomRepositoryExtension } from '../../../src/entities/user/user-email/repository/email-change-custom-repository-extension.js';
import { PasswordResetEntity } from '../../../src/entities/user/user-password/password-reset.entity.js';
import { userPasswordResetCustomRepositoryExtension } from '../../../src/entities/user/user-password/repository/user-password-custom-repository-extension.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';

// Tests for the plan-11 internal email-flow bridges rocketadmin-saas calls (microservice JWT):
//   POST /saas/user/password/reset/request | /saas/user/password/reset/verify/:token
//   POST /saas/user/email/change/request   | /saas/user/email/change/verify/:token
//   POST /saas/user/email/verify/request   (re-send confirmation)
//   POST /saas/company/:companyId/invite   | /saas/company/invite/verify/:token
// The invite happy-path verification is covered in rocketadmin-saas's own suite (it needs the
// company row in the SaaS DB for the recount webhook); here we cover everything reachable with
// the core alone. Raw tokens are minted through the same repository extensions production uses.

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

async function findUser(userId: string): Promise<UserEntity | null> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	return await dataSource.getRepository(UserEntity).findOne({ where: { id: userId } });
}

async function activateUser(userId: string): Promise<void> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const user = await userRepository.findOne({ where: { id: userId } });
	user.isActive = true;
	await userRepository.save(user);
}

async function mintPasswordResetToken(userId: string): Promise<string> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const repo = dataSource.getRepository(PasswordResetEntity).extend(userPasswordResetCustomRepositoryExtension);
	const user = await dataSource.getRepository(UserEntity).findOne({ where: { id: userId } });
	const { rawToken } = await repo.createOrUpdatePasswordResetEntity(user);
	return rawToken;
}

async function mintEmailChangeToken(userId: string): Promise<string> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const repo = dataSource.getRepository(EmailChangeEntity).extend(emailChangeCustomRepositoryExtension);
	const user = await dataSource.getRepository(UserEntity).findOne({ where: { id: userId } });
	const { rawToken } = await repo.createOrUpdateEmailChangeEntity(user);
	return rawToken;
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

currentTest = 'POST /saas/user/password/reset/request';

test.serial(`${currentTest} accepts a known user (with a link base) and requests the reset`, async (t) => {
	const { email, companyId } = await registerUser();

	const result = await request(app.getHttpServer())
		.post('/saas/user/password/reset/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email, companyId, verificationLinkBase: 'https://app.sitenova.com/password-reset' });

	t.is(result.status, 201);
	t.pass();
});

test.serial(`${currentTest} rejects an unknown user`, async (t) => {
	const result = await request(app.getHttpServer())
		.post('/saas/user/password/reset/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email: `nobody_${faker.string.alphanumeric(8)}@example.com`, companyId: faker.string.uuid() });

	t.is(result.status, 403);
	t.pass();
});

currentTest = 'POST /saas/user/password/reset/verify/:verificationString';

test.serial(`${currentTest} replaces the password (login bridge accepts the new one)`, async (t) => {
	const { userId, email, companyId } = await registerUser();
	const rawToken = await mintPasswordResetToken(userId);
	const newPassword = `N3w!${STRONG_PASSWORD}`;

	const result = await request(app.getHttpServer())
		.post(`/saas/user/password/reset/verify/${rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ password: newPassword });

	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.id, userId);
	t.is(ro.email, email);

	const loginResult = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email, password: newPassword, companyId, request_domain: '127.0.0.1' });
	t.is(loginResult.status, 201);

	const oldPasswordLogin = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email, password: STRONG_PASSWORD, companyId, request_domain: '127.0.0.1' });
	t.is(oldPasswordLogin.status, 400);
	t.pass();
});

test.serial(`${currentTest} rejects an unknown token`, async (t) => {
	const result = await request(app.getHttpServer())
		.post(`/saas/user/password/reset/verify/${'b'.repeat(40)}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ password: STRONG_PASSWORD });

	t.is(result.status, 400);
	t.pass();
});

currentTest = 'POST /saas/user/email/change/request';

test.serial(`${currentTest} rejects an inactive user and accepts an activated one`, async (t) => {
	const { userId } = await registerUser();

	const inactiveResult = await request(app.getHttpServer())
		.post('/saas/user/email/change/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId });
	t.is(inactiveResult.status, 403);

	await activateUser(userId);

	const activeResult = await request(app.getHttpServer())
		.post('/saas/user/email/change/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, verificationLinkBase: 'https://app.sitenova.com/email-change' });
	t.is(activeResult.status, 201);
	t.pass();
});

currentTest = 'POST /saas/user/email/change/verify/:verificationString';

test.serial(`${currentTest} changes the email and consumes the token`, async (t) => {
	const { userId } = await registerUser();
	await activateUser(userId);
	const rawToken = await mintEmailChangeToken(userId);
	const newEmail = `changed_${faker.string.alphanumeric(8)}@example.com`.toLowerCase();

	const result = await request(app.getHttpServer())
		.post(`/saas/user/email/change/verify/${rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email: newEmail });

	t.is(result.status, 201);
	const user = await findUser(userId);
	t.is(user.email, newEmail);

	// the token is single-use
	const secondResult = await request(app.getHttpServer())
		.post(`/saas/user/email/change/verify/${rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email: `other_${newEmail}` });
	t.is(secondResult.status, 400);
	t.pass();
});

test.serial(`${currentTest} rejects an email that is already in use`, async (t) => {
	const { userId } = await registerUser();
	const { email: takenEmail } = await registerUser();
	await activateUser(userId);
	const rawToken = await mintEmailChangeToken(userId);

	const result = await request(app.getHttpServer())
		.post(`/saas/user/email/change/verify/${rawToken}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ email: takenEmail });

	t.is(result.status, 400);
	t.pass();
});

currentTest = 'POST /saas/user/email/verify/request';

test.serial(`${currentTest} re-sends for an inactive user and rejects an already-confirmed one`, async (t) => {
	const { userId } = await registerUser();

	const result = await request(app.getHttpServer())
		.post('/saas/user/email/verify/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId, verificationLinkBase: 'https://app.sitenova.com/saas/user/email/verify' });
	t.is(result.status, 201);

	await activateUser(userId);

	const confirmedResult = await request(app.getHttpServer())
		.post('/saas/user/email/verify/request')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ userId });
	t.is(confirmedResult.status, 400);
	t.pass();
});

currentTest = 'POST /saas/company/:companyId/invite';

test.serial(`${currentTest} creates an invitation (token surfaced only under test env)`, async (t) => {
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
			inviteLinkBase: `https://app.sitenova.com/invite/${companyId}`,
		});

	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.email, invitedEmail);
	t.is(ro.companyId, companyId);
	t.is(typeof ro.verificationString, 'string');
	t.pass();
});

currentTest = 'POST /saas/company/invite/verify/:verificationString';

test.serial(`${currentTest} rejects an unknown token`, async (t) => {
	const result = await request(app.getHttpServer())
		.post(`/saas/company/invite/verify/${'c'.repeat(40)}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.send({ password: STRONG_PASSWORD, userName: 'Invited User' });

	t.is(result.status, 400);
	t.pass();
});

currentTest = 'internal email-flow endpoints auth';

test.serial(`${currentTest} reject requests without a microservice JWT`, async (t) => {
	const paths = [
		'/saas/user/password/reset/request',
		`/saas/user/password/reset/verify/${'d'.repeat(40)}`,
		'/saas/user/email/change/request',
		`/saas/user/email/change/verify/${'d'.repeat(40)}`,
		'/saas/user/email/verify/request',
		`/saas/company/${faker.string.uuid()}/invite`,
		`/saas/company/invite/verify/${'d'.repeat(40)}`,
	];
	for (const path of paths) {
		const result = await request(app.getHttpServer()).post(path).set('Content-Type', 'application/json').send({});
		t.is(result.status, 401, `expected 401 for ${path}`);
	}
	t.pass();
});
