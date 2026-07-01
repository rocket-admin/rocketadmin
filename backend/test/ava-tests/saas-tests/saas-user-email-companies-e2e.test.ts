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
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';

// Tests for the SaaS bridge GET /saas/company/my/email/:email (SaaSAuthMiddleware / microservice JWT).
// It duplicates the open-source GET /company/my/email/:email lookup so rocketadmin-saas can expose the
// same "which companies is this email in" list (used by the multi-company login picker). The
// open-source endpoint is unchanged.

let app: INestApplication;
let currentTest: string;
let _testUtils: TestUtils;

// A microservice JWT identical in shape to the one rocketadmin-saas signs (payload { request_id }).
function microserviceAuthHeader(): string {
	const token = jwt.sign({ request_id: faker.string.uuid() }, appConfig.auth.microserviceJwtSecret);
	return `Bearer ${token}`;
}

async function createCoreUserWithCompany(): Promise<{ email: string; companyId: string; companyName: string }> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const companyRepository = dataSource.getRepository(CompanyInfoEntity);

	const email = `${faker.lorem.word()}_${faker.string.alphanumeric(6)}_${faker.internet.email()}`.toLowerCase();
	const companyName = faker.company.name();

	const company = await companyRepository.save(
		companyRepository.create({ id: faker.string.uuid(), name: companyName }),
	);
	await userRepository.save(
		userRepository.create({
			email,
			password: `#r@dY^e&7R4b5Ib@31iE4xbn`,
			isActive: true,
			company,
			role: UserRoleEnum.ADMIN,
		}),
	);

	return { email, companyId: company.id, companyName };
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

currentTest = 'GET /saas/company/my/email/:email';

test.serial(`${currentTest} returns the companies a registered email belongs to`, async (t) => {
	const { email, companyId, companyName } = await createCoreUserWithCompany();

	const result = await request(app.getHttpServer())
		.get(`/saas/company/my/email/${encodeURIComponent(email)}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');

	t.is(result.status, 200);
	const ro = JSON.parse(result.text);
	t.true(Array.isArray(ro));
	const found = ro.find((c: { id: string; name?: string }) => c.id === companyId);
	t.truthy(found);
	t.is(found.name, companyName);
});

test.serial(`${currentTest} rejects an email with no registered companies`, async (t) => {
	const result = await request(app.getHttpServer())
		.get(`/saas/company/my/email/${encodeURIComponent(`nobody_${faker.string.alphanumeric(8)}@example.com`)}`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	const ro = JSON.parse(result.text);
	t.is(ro.message, Messages.COMPANIES_USER_EMAIL_NOT_FOUND);
});

test.serial(`${currentTest} rejects a malformed email`, async (t) => {
	const result = await request(app.getHttpServer())
		.get(`/saas/company/my/email/not-an-email`)
		.set('Authorization', microserviceAuthHeader())
		.set('Accept', 'application/json');

	t.is(result.status, 400);
});

test.serial(`${currentTest} rejects a request without a microservice JWT`, async (t) => {
	const { email } = await createCoreUserWithCompany();

	const result = await request(app.getHttpServer())
		.get(`/saas/company/my/email/${encodeURIComponent(email)}`)
		.set('Accept', 'application/json');

	t.is(result.status, 401);
});
