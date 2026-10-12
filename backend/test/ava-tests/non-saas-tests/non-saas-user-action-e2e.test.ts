import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { UserActionEnum } from '../../../src/enums/user-action.enum.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import {
	createInitialTestUser,
	registerUserAndReturnUserInfo,
} from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

// `user_action.userId` is UNIQUE (one row per user). The frontend posts an action every time the
// "add connection" page opens, so the endpoint must be an upsert: a repeat (or concurrent) request for
// the same user updates the one row instead of failing with
// `duplicate key value violates unique constraint "REL_c025478b45e60017ed10c77f99"`.

let app: INestApplication;
let currentTest: string;

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	app = moduleFixture.createNestApplication() as any;

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

function postAction(token: string, message: string) {
	return request(app.getHttpServer())
		.post('/action')
		.send({ message })
		.set('Cookie', token)
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json');
}

currentTest = 'POST /action';

test.serial(
	`${currentTest} should create the user action on first call and update the same row afterwards`,
	async (t) => {
		const { token } = await registerUserAndReturnUserInfo(app);

		const first = await postAction(token, UserActionEnum.CONNECTION_CREATION_NOT_FINISHED);
		t.is(first.status, 201, JSON.stringify(first.body));
		t.truthy(first.body.id);
		t.is(first.body.message, UserActionEnum.CONNECTION_CREATION_NOT_FINISHED);
		t.is(first.body.mail_sent, false);

		const second = await postAction(token, UserActionEnum.CONNECTION_CREATION_FINISHED);
		t.is(second.status, 201, JSON.stringify(second.body));
		t.is(second.body.id, first.body.id, 'the existing row is updated, not duplicated');
		t.is(second.body.message, UserActionEnum.CONNECTION_CREATION_FINISHED);
	},
);

test.serial(`${currentTest} should tolerate concurrent calls for the same user`, async (t) => {
	const { token } = await registerUserAndReturnUserInfo(app);

	const responses = await Promise.all(
		Array.from({ length: 8 }, () => postAction(token, UserActionEnum.CONNECTION_CREATION_NOT_FINISHED)),
	);

	for (const response of responses) {
		t.is(response.status, 201, JSON.stringify(response.body));
	}
	const ids = new Set(responses.map((response) => response.body.id));
	t.is(ids.size, 1, 'every concurrent request resolved to the single row for this user');
});
