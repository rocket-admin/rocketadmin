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

// Microservice JWT (request_id claim) for the internal saas bridge controller.
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

async function loginAndReturnCookieToken(): Promise<string> {
	const { email, password } = await registerUserAndReturnUserInfo(app);
	const loginUserResult = await request(app.getHttpServer())
		.post('/user/login/')
		.send({ email, password })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return loginUserResult.headers['set-cookie'][0].split(';')[0].replace('rocketadmin_cookie=', '');
}

function logoutRequest(body: Record<string, unknown>, withAuth = true): request.Test {
	const req = request(app.getHttpServer())
		.post('/saas/user/logout')
		.send(body)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	return withAuth ? req.set('Authorization', microserviceAuthHeader()) : req;
}

currentTest = 'POST /saas/user/logout (internal, microservice JWT)';

test.serial(`${currentTest} blacklists the token so later validations fail`, async (t) => {
	const cookieToken = await loginAndReturnCookieToken();

	// The token is valid before logout.
	const userBefore = await request(app.getHttpServer())
		.get('/user')
		.set('Cookie', `rocketadmin_cookie=${cookieToken}`)
		.set('Accept', 'application/json');
	t.is(userBefore.status, 200);

	const logoutResult = await logoutRequest({ token: cookieToken });
	t.is(logoutResult.status, 201);
	t.deepEqual(JSON.parse(logoutResult.text), { success: true });

	// The core's own auth middleware rejects the logged-out token.
	const userAfter = await request(app.getHttpServer())
		.get('/user')
		.set('Cookie', `rocketadmin_cookie=${cookieToken}`)
		.set('Accept', 'application/json');
	t.is(userAfter.status, 401);

	// The agents-microservice validation chain rejects it too.
	const validateResult = await request(app.getHttpServer())
		.post('/internal/agents/auth/validate-user-token')
		.send({ token: cookieToken })
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(validateResult.status, 401);

	// And the saas-microservice validation bridge (used by the saas AuthMiddleware).
	const saasValidateResult = await request(app.getHttpServer())
		.post('/saas/user/validate-token')
		.send({ token: cookieToken })
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(saasValidateResult.status, 401);
});

test.serial(`${currentTest} rejects calls without a token in the body (400)`, async (t) => {
	const response = await logoutRequest({});
	t.is(response.status, 400);
});

test.serial(`${currentTest} rejects calls without the microservice JWT (401)`, async (t) => {
	const cookieToken = await loginAndReturnCookieToken();
	const response = await logoutRequest({ token: cookieToken }, false);
	t.is(response.status, 401);
});

currentTest = 'POST /saas/user/validate-token (internal, microservice JWT)';

test.serial(`${currentTest} returns the token claims (incl. companyId) for a live token`, async (t) => {
	const cookieToken = await loginAndReturnCookieToken();

	const response = await request(app.getHttpServer())
		.post('/saas/user/validate-token')
		.send({ token: cookieToken })
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(response.status, 201);
	const ro = JSON.parse(response.text);
	const decoded = jwt.decode(cookieToken) as jwt.JwtPayload;
	t.is(ro.sub, decoded.id);
	t.is(ro.companyId, decoded.companyId);
	t.truthy(ro.companyId);
});

test.serial(`${currentTest} rejects unauthenticated calls (401)`, async (t) => {
	const cookieToken = await loginAndReturnCookieToken();

	const response = await request(app.getHttpServer())
		.post('/saas/user/validate-token')
		.send({ token: cookieToken })
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
	t.is(response.status, 401);
});
