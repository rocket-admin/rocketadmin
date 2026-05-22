/* eslint-disable @typescript-eslint/no-unused-vars */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { CedarAction } from '../../../src/entities/cedar-authorization/cedar-action-map.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
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

test.after(async () => {
	await Cacher.clearAllCache();
	await app.close();
});

test.serial('GET /permissions/available returns catalog covering every CedarAction', async (t) => {
	const token = (await registerUserAndReturnUserInfo(app)).token;

	const response = await request(app.getHttpServer())
		.get('/permissions/available')
		.set('Cookie', token)
		.set('Accept', 'application/json');

	t.is(response.status, 200);

	const body = response.body as {
		groups: Array<{
			group: string;
			actions: Array<{ value: string; label: string; shortLabel: string; icon: string; resource?: string }>;
		}>;
	};

	t.true(Array.isArray(body.groups));
	t.true(body.groups.length > 0);

	const flatActions = body.groups.flatMap((g) => g.actions);
	const values = new Set(flatActions.map((a) => a.value));

	for (const cedarValue of Object.values(CedarAction)) {
		t.true(values.has(cedarValue), `catalog missing CedarAction ${cedarValue}`);
	}

	t.true(values.has('*'), 'catalog must include the General * wildcard');
	t.true(values.has('table:*'), 'catalog must include the table:* wildcard');
	t.true(values.has('dashboard:*'), 'catalog must include the dashboard:* wildcard');

	for (const action of flatActions) {
		t.truthy(action.label, `action ${action.value} missing label`);
		t.truthy(action.shortLabel, `action ${action.value} missing shortLabel`);
		t.truthy(action.icon, `action ${action.value} missing icon`);
	}

	const byValue = new Map(flatActions.map((a) => [a.value, a]));

	t.is(byValue.get('connection:edit')!.label, 'Connection full access');
	t.is(byValue.get('table:read')!.resource, 'table');
	t.is(byValue.get('dashboard:read')!.resource, 'dashboard');
	t.is(byValue.get('dashboard:create')!.resource, undefined);
	t.is(byValue.get('*')!.resource, undefined);
	t.is(byValue.get('connection:read')!.resource, undefined);
});

test.serial('GET /permissions/available requires authentication', async (t) => {
	const response = await request(app.getHttpServer()).get('/permissions/available').set('Accept', 'application/json');

	t.is(response.status, 401);
});
