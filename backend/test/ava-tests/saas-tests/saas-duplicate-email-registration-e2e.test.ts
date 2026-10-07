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
import { ExternalRegistrationProviderEnum } from '../../../src/entities/user/enums/external-registration-provider.enum.js';
import { UserEntity } from '../../../src/entities/user/user.entity.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ExceptionsInternalCodes } from '../../../src/exceptions/custom-exceptions/custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { appConfig } from '../../../src/shared/config/app-config.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';

// Plan 53 — one account per email address. The three microservice-JWT bridges that create user
// rows (POST /saas/user/register, POST /saas/user/google/login, POST /saas/user/github/login)
// reject a self-service registration of an address that already has an account in ANY company,
// with ANY provider, confirmed or not: 400 + internalCode 1102 + a message naming the door to
// use. Existing duplicates (invitations, legacy rows) are untouched — see user-e2e.test.ts for
// the multi-company login of a pre-existing duplicate.

let app: INestApplication;
let currentTest: string;

function microserviceAuthHeader(): string {
	const token = jwt.sign({ request_id: faker.string.uuid() }, appConfig.auth.microserviceJwtSecret);
	return `Bearer ${token}`;
}

function randomEmail(): string {
	return `${faker.lorem.word()}_${faker.string.alphanumeric(8)}_${faker.internet.email()}`.toLowerCase();
}

function registrationBody(email: string, extraFields: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		email,
		password: `#r@dY^e&7R4b5Ib@31iE4xbn`,
		name: faker.person.firstName(),
		companyId: faker.string.uuid(),
		companyName: faker.company.name(),
		gclidValue: null,
		suppressEmail: true,
		...extraFields,
	};
}

async function postBridge(path: string, body: Record<string, unknown>): Promise<request.Response> {
	return await request(app.getHttpServer())
		.post(path)
		.set('Authorization', microserviceAuthHeader())
		.set('Content-Type', 'application/json')
		.set('Accept', 'application/json')
		.send(body);
}

async function registerWithPassword(email: string): Promise<{ status: number; body: Record<string, unknown> }> {
	const result = await postBridge('/saas/user/register', registrationBody(email));
	return { status: result.status, body: JSON.parse(result.text) };
}

async function usersWithEmail(email: string): Promise<Array<UserEntity>> {
	const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
	return await dataSource
		.getRepository(UserEntity)
		.createQueryBuilder('user')
		.leftJoinAndSelect('user.company', 'company')
		.where('user.email = :email', { email: email.toLowerCase() })
		.getMany();
}

function assertRejected(
	t: { is: (actual: unknown, expected: unknown, message?: string) => void },
	status: number,
	body: Record<string, unknown>,
	provider: ExternalRegistrationProviderEnum | null,
): void {
	t.is(status, 400);
	t.is(body.internalCode, ExceptionsInternalCodes.EMAIL_ALREADY_REGISTERED);
	t.is(body.message, Messages.EMAIL_ALREADY_REGISTERED(provider));
}

test.before(async () => {
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
	try {
		await Cacher.clearAllCache();
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

currentTest = 'POST /saas/user/register (duplicate email)';

test.serial(`${currentTest} rejects a second registration of the same address in a fresh company`, async (t) => {
	const email = randomEmail();
	const first = await registerWithPassword(email);
	t.is(first.status, 201);
	const firstCompanyId = (await usersWithEmail(email))[0].company.id;

	const second = await registerWithPassword(email);
	assertRejected(t, second.status, second.body, null);

	const rows = await usersWithEmail(email);
	t.is(rows.length, 1, 'exactly one account for the address');
	t.is(rows[0].id, first.body.id as string);
	t.is(rows[0].company.id, firstCompanyId, 'the first company is untouched');
	t.pass();
});

test.serial(`${currentTest} matches the address case-insensitively`, async (t) => {
	const local = `${faker.lorem.word()}_${faker.string.alphanumeric(8)}`;
	const lower = `${local}@example-mail.test`;
	const first = await registerWithPassword(lower);
	t.is(first.status, 201);

	const second = await registerWithPassword(`${local.toUpperCase()}@Example-Mail.TEST`);
	assertRejected(t, second.status, second.body, null);
	t.is((await usersWithEmail(lower)).length, 1);
	t.pass();
});

test.serial(`${currentTest} rejects the password form when the address belongs to a Google account`, async (t) => {
	const email = randomEmail();
	const google = await postBridge('/saas/user/google/login', {
		email,
		name: faker.person.firstName(),
		glidCookieValue: null,
	});
	t.is(google.status, 201);

	const second = await registerWithPassword(email);
	assertRejected(t, second.status, second.body, ExternalRegistrationProviderEnum.GOOGLE);
	t.is((await usersWithEmail(email)).length, 1);
	t.pass();
});

test.serial(`${currentTest} lets exactly one of many concurrent registrations through`, async (t) => {
	const email = randomEmail();
	const attempts = 10;
	const results = await Promise.all(
		Array.from({ length: attempts }, () => postBridge('/saas/user/register', registrationBody(email))),
	);
	const statuses = results.map((r) => r.status).sort();
	t.is(statuses.filter((s) => s === 201).length, 1, `one 201 among ${statuses.join(',')}`);
	t.is(statuses.filter((s) => s === 400).length, attempts - 1);
	for (const rejected of results.filter((r) => r.status === 400)) {
		t.is(JSON.parse(rejected.text).internalCode, ExceptionsInternalCodes.EMAIL_ALREADY_REGISTERED);
	}
	t.is((await usersWithEmail(email)).length, 1, 'exactly one row survives the race');
	t.pass();
});

currentTest = 'POST /saas/user/google/login (duplicate email)';

test.serial(`${currentTest} rejects a new Google account for an address owned by a password account`, async (t) => {
	const email = randomEmail();
	const first = await registerWithPassword(email);
	t.is(first.status, 201);

	const google = await postBridge('/saas/user/google/login', {
		email,
		name: faker.person.firstName(),
		glidCookieValue: null,
	});
	assertRejected(t, google.status, JSON.parse(google.text), null);

	const rows = await usersWithEmail(email);
	t.is(rows.length, 1);
	t.is(rows[0].externalRegistrationProvider, null, 'the password account is the only one');
	t.pass();
});

test.serial(`${currentTest} still logs an existing Google account in (login-or-create unchanged)`, async (t) => {
	const email = randomEmail();
	const body = { email, name: faker.person.firstName(), glidCookieValue: null };
	const first = await postBridge('/saas/user/google/login', body);
	t.is(first.status, 201);
	const second = await postBridge('/saas/user/google/login', { ...body, name: 'Renamed' });
	t.is(second.status, 201);
	t.is(JSON.parse(second.text).id, JSON.parse(first.text).id);

	const rows = await usersWithEmail(email);
	t.is(rows.length, 1);
	t.is(rows[0].name, 'Renamed');
	t.pass();
});

currentTest = 'POST /saas/user/github/login (duplicate email)';

test.serial(`${currentTest} rejects a new GitHub identity for an address owned by a password account`, async (t) => {
	const email = randomEmail();
	const first = await registerWithPassword(email);
	t.is(first.status, 201);

	const github = await postBridge('/saas/user/github/login', {
		email,
		name: faker.person.firstName(),
		githubId: faker.number.int({ min: 1_000_000, max: 9_000_000 }),
		glidCookieValue: null,
	});
	assertRejected(t, github.status, JSON.parse(github.text), null);
	t.is((await usersWithEmail(email)).length, 1);
	t.pass();
});

test.serial(`${currentTest} rejects the password form when the address belongs to a GitHub account`, async (t) => {
	const email = randomEmail();
	const github = await postBridge('/saas/user/github/login', {
		email,
		name: faker.person.firstName(),
		githubId: faker.number.int({ min: 1_000_000, max: 9_000_000 }),
		glidCookieValue: null,
	});
	t.is(github.status, 201);

	const second = await registerWithPassword(email);
	assertRejected(t, second.status, second.body, ExternalRegistrationProviderEnum.GITHUB);
	t.is((await usersWithEmail(email)).length, 1);
	t.pass();
});

test.serial(
	`${currentTest} keeps a known GitHub user's address when the new one belongs to someone else`,
	async (t) => {
		const githubEmail = randomEmail();
		const takenEmail = randomEmail();
		const githubId = faker.number.int({ min: 1_000_000, max: 9_000_000 });
		const passwordOwner = await registerWithPassword(takenEmail);
		t.is(passwordOwner.status, 201);

		const first = await postBridge('/saas/user/github/login', {
			email: githubEmail,
			name: faker.person.firstName(),
			githubId,
			glidCookieValue: null,
		});
		t.is(first.status, 201);

		// Same GitHub id, now reporting the password owner's address as primary.
		const second = await postBridge('/saas/user/github/login', {
			email: takenEmail,
			name: faker.person.firstName(),
			githubId,
			glidCookieValue: null,
		});
		t.is(second.status, 201, 'the login itself still succeeds');
		t.is(JSON.parse(second.text).id, JSON.parse(first.text).id);
		t.is(JSON.parse(second.text).email, githubEmail, 'the stored address is kept');
		t.is((await usersWithEmail(takenEmail)).length, 1, 'the password owner keeps sole ownership');
		t.is((await usersWithEmail(githubEmail)).length, 1);
		t.pass();
	},
);

test.serial(`${currentTest} follows a known GitHub user's new address when it is free`, async (t) => {
	const githubEmail = randomEmail();
	const newEmail = randomEmail();
	const githubId = faker.number.int({ min: 1_000_000, max: 9_000_000 });
	const first = await postBridge('/saas/user/github/login', {
		email: githubEmail,
		name: faker.person.firstName(),
		githubId,
		glidCookieValue: null,
	});
	t.is(first.status, 201);

	const second = await postBridge('/saas/user/github/login', {
		email: newEmail,
		name: faker.person.firstName(),
		githubId,
		glidCookieValue: null,
	});
	t.is(second.status, 201);
	t.is(JSON.parse(second.text).email, newEmail);
	t.is((await usersWithEmail(githubEmail)).length, 0);
	t.is((await usersWithEmail(newEmail)).length, 1);
	t.pass();
});
