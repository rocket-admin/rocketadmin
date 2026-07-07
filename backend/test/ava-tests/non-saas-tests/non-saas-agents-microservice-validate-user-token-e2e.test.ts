/* eslint-disable @typescript-eslint/no-unused-vars */
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
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest;

// Microservice JWT (request_id claim) for the internal agents controller.
function microserviceAuthHeader(): string {
	const secret = appConfig.auth.microserviceJwtSecret as string;
	return `Bearer ${jwt.sign({ request_id: faker.string.uuid() }, secret, { expiresIn: '1h' })}`;
}

test.before(async () => {
	setSaasEnvVariable();
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

async function loginAndReturnCookieToken(): Promise<{ cookieToken: string; userId: string }> {
	const { email, password } = await registerUserAndReturnUserInfo(app);
	const loginUserResult = await request(app.getHttpServer())
		.post('/user/login/')
		.send({ email, password })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	const cookieToken = loginUserResult.headers['set-cookie'][0].split(';')[0].replace('rocketadmin_cookie=', '');
	const decoded = jwt.decode(cookieToken) as jwt.JwtPayload;
	return { cookieToken, userId: decoded.id };
}

function validateUserTokenRequest(token: string, withAuth = true): request.Test {
	const req = request(app.getHttpServer())
		.post('/internal/agents/auth/validate-user-token')
		.send({ token })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return withAuth ? req.set('Authorization', microserviceAuthHeader()) : req;
}

currentTest = 'POST /internal/agents/auth/validate-user-token (internal, microservice JWT)';

test.serial(`${currentTest} returns the token claims including the companyId of the user's company`, async (t) => {
	const { cookieToken, userId } = await loginAndReturnCookieToken();

	const foundCompanyInfo = await request(app.getHttpServer())
		.get('/company/my')
		.set('Cookie', `rocketadmin_cookie=${cookieToken}`)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(foundCompanyInfo.status, 200);
	const foundCompanyInfoRO = JSON.parse(foundCompanyInfo.text);

	const response = await validateUserTokenRequest(cookieToken);
	t.is(response.status, 201);
	const ro = JSON.parse(response.text);
	t.is(ro.sub, userId);
	t.truthy(ro.companyId);
	t.is(ro.companyId, foundCompanyInfoRO.id);
});

test.serial(`${currentTest} returns companyId null for a legacy token issued without the claim`, async (t) => {
	const { userId } = await loginAndReturnCookieToken();

	const legacyToken = jwt.sign(
		{
			id: userId,
			email: 'legacy@example.com',
			exp: Math.floor(Date.now() / 1000) + 3600,
		},
		appConfig.auth.jwtSecret as string,
	);

	const response = await validateUserTokenRequest(legacyToken);
	t.is(response.status, 201);
	const ro = JSON.parse(response.text);
	t.is(ro.sub, userId);
	t.is(ro.companyId, null);
});

test.serial(`${currentTest} rejects calls without the microservice JWT (401)`, async (t) => {
	const { cookieToken } = await loginAndReturnCookieToken();

	const response = await validateUserTokenRequest(cookieToken, false);
	t.is(response.status, 401);
});
