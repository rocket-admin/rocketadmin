/* eslint-disable @typescript-eslint/no-unused-vars */

import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ApplicationModule } from '../../../src/app.module.js';
import { BaseType } from '../../../src/common/data-injection.tokens.js';
import { CompanyInfoEntity } from '../../../src/entities/company-info/company-info.entity.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { UserEntity } from '../../../src/entities/user/user.entity.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';

let app: INestApplication;
let currentTest: string;

async function clearDatabase(dataSource: DataSource): Promise<void> {
	const userRepository = dataSource.getRepository(UserEntity);
	const companyRepository = dataSource.getRepository(CompanyInfoEntity);
	await userRepository.createQueryBuilder().delete().from(UserEntity).execute();
	await companyRepository.createQueryBuilder().delete().from(CompanyInfoEntity).execute();
}

test.beforeEach(async () => {
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
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

currentTest = 'GET /selfhosted/is-configured';

test.skip(`${currentTest} should return isConfigured false when no users exist`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);

	await clearDatabase(dataSource);

	const result = await request(app.getHttpServer())
		.get('/selfhosted/is-configured')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(result.status, 200);
	const responseBody = JSON.parse(result.text);
	console.log('🚀 ~ responseBody:', responseBody);
	t.is(responseBody.isConfigured, false);
	t.pass();
});

test.skip(`${currentTest} should return isConfigured true when users exist`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const companyRepository = dataSource.getRepository(CompanyInfoEntity);

	await clearDatabase(dataSource);

	const company = companyRepository.create({
		id: faker.string.uuid(),
		name: faker.company.name(),
	});
	await companyRepository.save(company);

	const user = userRepository.create({
		email: faker.internet.email().toLowerCase(),
		password: 'TestPassword123!',
		isActive: true,
		company: company,
	});
	await userRepository.save(user);

	const result = await request(app.getHttpServer())
		.get('/selfhosted/is-configured')
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(result.status, 200);
	const responseBody = JSON.parse(result.text);
	t.is(responseBody.isConfigured, true);
	t.pass();
});

currentTest = 'POST /selfhosted/initial-user';

test.skip(`${currentTest} should create initial user when instance is not configured`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);

	await clearDatabase(dataSource);

	const email = faker.internet.email().toLowerCase();
	const password = 'UserPassword123!';

	const result = await request(app.getHttpServer())
		.post('/selfhosted/initial-user')
		.send({ email, password })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	const responseBody = JSON.parse(result.text);
	console.log('🚀 ~ responseBody:', responseBody);

	t.is(result.status, 201);
	t.is(responseBody.email, email);
	t.is(Object.hasOwn(responseBody, 'id'), true);
	t.is(responseBody.isActive, true);

	const createdUser = await userRepository.findOne({ where: { email } });
	t.truthy(createdUser);
	t.is(createdUser.email, email);
	t.pass();
});

test.skip(`${currentTest} should return error when instance is already configured`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	const userRepository = dataSource.getRepository(UserEntity);
	const companyRepository = dataSource.getRepository(CompanyInfoEntity);

	await clearDatabase(dataSource);

	const company = companyRepository.create({
		id: faker.string.uuid(),
		name: faker.company.name(),
	});
	await companyRepository.save(company);

	const existingUser = userRepository.create({
		email: faker.internet.email().toLowerCase(),
		password: 'ExistingPassword123!',
		isActive: true,
		company: company,
	});
	await userRepository.save(existingUser);

	const newEmail = faker.internet.email().toLowerCase();
	const newPassword = 'NewUserPassword123!';

	const result = await request(app.getHttpServer())
		.post('/selfhosted/initial-user')
		.send({ email: newEmail, password: newPassword })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	const responseBody = JSON.parse(result.text);
	t.is(responseBody.message, Messages.SELF_HOSTED_ALREADY_CONFIGURED);
	t.pass();
});

test.skip(`${currentTest} should return validation error for invalid email`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);

	await clearDatabase(dataSource);

	const invalidEmail = 'invalid-email';
	const password = 'UserPassword123!';

	const result = await request(app.getHttpServer())
		.post('/selfhosted/initial-user')
		.send({ email: invalidEmail, password })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	t.pass();
});

test.skip(`${currentTest} should return validation error for short password`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);

	await clearDatabase(dataSource);

	const email = faker.internet.email().toLowerCase();
	const shortPassword = 'short';

	const result = await request(app.getHttpServer())
		.post('/selfhosted/initial-user')
		.send({ email, password: shortPassword })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	t.pass();
});

test.skip(`${currentTest} should return validation error when email is missing`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);

	await clearDatabase(dataSource);

	const password = 'UserPassword123!';

	const result = await request(app.getHttpServer())
		.post('/selfhosted/initial-user')
		.send({ password })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	t.pass();
});

test.skip(`${currentTest} should return validation error when password is missing`, async (t) => {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);

	await clearDatabase(dataSource);

	const email = faker.internet.email().toLowerCase();

	const result = await request(app.getHttpServer())
		.post('/selfhosted/initial-user')
		.send({ email })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');

	t.is(result.status, 400);
	t.pass();
});
