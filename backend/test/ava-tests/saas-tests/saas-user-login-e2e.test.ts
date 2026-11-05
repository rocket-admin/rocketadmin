import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import CryptoJS from 'crypto-js';
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

test.serial(`${currentTest} refuses a suspended user with 401`, async (t) => {
	const { email, password, companyId, userId } = await createCoreUser();
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	await dataSource.getRepository(UserEntity).update({ id: userId }, { suspended: true });

	const result = await request(app.getHttpServer())
		.post('/saas/user/login')
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send({ email, password, companyId, request_domain: '127.0.0.1' });

	t.is(result.status, 401, result.text);
	t.is(Object.hasOwn(JSON.parse(result.text), 'id'), false);
});

test.serial(`${currentTest} stores the OTP seed encrypted before enrollment completes`, async (t) => {
	const { userId } = await createCoreUser();
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const seed = 'JBSWY3DPEHPK3PXP';

	// The same path as generate-otp: a save with isOTPEnabled still false.
	const user = await userRepository.findOneByOrFail({ id: userId });
	user.otpSecretKey = seed;
	await userRepository.save(user);

	const [raw] = await dataSource.query('SELECT "otpSecretKey" FROM "user" WHERE id = $1', [userId]);
	t.true(String(raw.otpSecretKey).startsWith('$v2:'), 'seed at rest must carry the V2 envelope');
	t.not(raw.otpSecretKey, seed);

	const reloaded = await userRepository.findOneByOrFail({ id: userId });
	t.is(reloaded.otpSecretKey, seed, 'the entity hook decrypts the seed on load');
});

test.serial(
	`${currentTest} decrypts a legacy V1 OTP seed on load and keeps the stored ciphertext on an unrelated save`,
	async (t) => {
		const { userId } = await createCoreUser({ isOTPEnabled: true });
		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const userRepository = dataSource.getRepository(UserEntity);
		const seed = 'JBSWY3DPEHPK3PXP';
		// The row of an enrolled user from before the V2 scheme: CryptoJS ciphertext at rest.
		const legacy = CryptoJS.AES.encrypt(seed, appConfig.auth.privateKey as string).toString();
		await dataSource.query('UPDATE "user" SET "otpSecretKey" = $1 WHERE id = $2', [legacy, userId]);

		const loaded = await userRepository.findOneByOrFail({ id: userId });
		t.is(loaded.otpSecretKey, seed, 'the load hook decrypts the V1 seed');

		loaded.name = 'touched';
		await userRepository.save(loaded);
		const [raw] = await dataSource.query('SELECT "otpSecretKey" FROM "user" WHERE id = $1', [userId]);
		t.is(raw.otpSecretKey, legacy, 'an unchanged seed is written back as the stored V1 ciphertext');
		const reloaded = await userRepository.findOneByOrFail({ id: userId });
		t.is(reloaded.otpSecretKey, seed);

		// A changed seed is encrypted anew, as V2.
		reloaded.otpSecretKey = 'KRSXG5CTMVRXEZLU';
		await userRepository.save(reloaded);
		const [rawAfterChange] = await dataSource.query('SELECT "otpSecretKey" FROM "user" WHERE id = $1', [userId]);
		t.true(String(rawAfterChange.otpSecretKey).startsWith('$v2:'));
		t.is((await userRepository.findOneByOrFail({ id: userId })).otpSecretKey, 'KRSXG5CTMVRXEZLU');
	},
);

test.serial(`${currentTest} does not re-encrypt a V2 seed with a new salt on an unrelated save`, async (t) => {
	const { userId } = await createCoreUser({ isOTPEnabled: true });
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const user = await userRepository.findOneByOrFail({ id: userId });
	user.otpSecretKey = 'JBSWY3DPEHPK3PXP';
	await userRepository.save(user);
	const [before] = await dataSource.query('SELECT "otpSecretKey" FROM "user" WHERE id = $1', [userId]);

	const loaded = await userRepository.findOneByOrFail({ id: userId });
	loaded.name = 'touched again';
	await userRepository.save(loaded);
	const [after] = await dataSource.query('SELECT "otpSecretKey" FROM "user" WHERE id = $1', [userId]);
	t.is(after.otpSecretKey, before.otpSecretKey);
});
