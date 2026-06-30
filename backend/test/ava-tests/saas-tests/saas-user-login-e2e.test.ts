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
import { CompanyInfoEntity } from '../../../src/entities/company-info/company-info.entity.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { UserRoleEnum } from '../../../src/entities/user/enums/user-role.enum.js';
import { UserEntity } from '../../../src/entities/user/user.entity.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';

// Tests for the SaaS login bridge POST /saas/user/login (SaaSAuthMiddleware / microservice JWT).
// The bridge verifies email + password and returns the user info (FoundUserDto) WITHOUT signing a
// token — rocketadmin-saas signs the cookie. The open-source POST /user/login path is unaffected.

let app: INestApplication;
let currentTest: string;
let _testUtils: TestUtils;

// A microservice JWT identical in shape to the one rocketadmin-saas signs (payload { request_id }).
function microserviceAuthHeader(): string {
	const token = jwt.sign({ request_id: faker.string.uuid() }, appConfig.auth.microserviceJwtSecret);
	return `Bearer ${token}`;
}

async function createCoreUser(opts: { isOTPEnabled?: boolean } = {}): Promise<{
	email: string;
	password: string;
	companyId: string;
	userId: string;
}> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const companyRepository = dataSource.getRepository(CompanyInfoEntity);

	const email = `${faker.lorem.word()}_${faker.string.alphanumeric(6)}_${faker.internet.email()}`.toLowerCase();
	const password = `#r@dY^e&7R4b5Ib@31iE4xbn`;

	const company = await companyRepository.save(
		companyRepository.create({ id: faker.string.uuid(), name: faker.company.name() }),
	);
	// password is hashed by UserEntity's @BeforeInsert hook (Encryptor.hashUserPassword).
	const user = await userRepository.save(
		userRepository.create({
			email,
			password,
			isActive: true,
			company,
			role: UserRoleEnum.ADMIN,
			isOTPEnabled: !!opts.isOTPEnabled,
		}),
	);

	return { email, password, companyId: company.id, userId: user.id };
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

currentTest = 'POST /saas/user/login';

test.serial(`${currentTest} verifies credentials and returns the user (no token signed here)`, async (t) => {
	const { email, password, companyId, userId } = await createCoreUser();

	const result = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send({ email, password, companyId, request_domain: '127.0.0.1' });

	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.id, userId);
	t.is(ro.email, email);
	t.is(ro.is_2fa_enabled, false);
	t.is(ro.suspended, false);
	// The bridge must NOT sign a token / set a cookie — that is rocketadmin-saas's job.
	t.is(Object.hasOwn(ro, 'token'), false);
	t.is(Object.hasOwn(ro, 'expires'), false);
	t.is(result.headers['set-cookie'], undefined);
	t.pass();
});

test.serial(`${currentTest} surfaces is_2fa_enabled so the caller can issue a temporary token`, async (t) => {
	const { email, password, companyId } = await createCoreUser({ isOTPEnabled: true });

	const result = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send({ email, password, companyId, request_domain: '127.0.0.1' });

	t.is(result.status, 201);
	const ro = JSON.parse(result.text);
	t.is(ro.email, email);
	t.is(ro.is_2fa_enabled, true);
	t.pass();
});

test.serial(`${currentTest} rejects a wrong password`, async (t) => {
	const { email, companyId } = await createCoreUser();

	const result = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send({ email, password: 'definitely-the-wrong-password', companyId, request_domain: '127.0.0.1' });

	t.is(result.status, 400);
	t.is(result.headers['set-cookie'], undefined);
	t.pass();
});

test.serial(`${currentTest} rejects an unknown user`, async (t) => {
	const result = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send({
			email: `nobody_${faker.string.alphanumeric(8)}@example.com`,
			password: 'whatever-password',
			request_domain: '127.0.0.1',
		});

	t.is(result.status, 404);
	t.pass();
});

test.serial(`${currentTest} rejects a request without a microservice JWT`, async (t) => {
	const { email, password, companyId } = await createCoreUser();

	const result = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send({ email, password, companyId, request_domain: '127.0.0.1' });

	t.is(result.status, 401);
	t.pass();
});
