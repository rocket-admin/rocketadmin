/* eslint-disable @typescript-eslint/no-unused-vars */
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ApplicationModule } from '../../../src/app.module.js';
import { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';
import { AllExceptionsFilter } from '../../../src/exceptions/all-exceptions.filter.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Messages } from '../../../src/exceptions/text/messages.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { TestUtils } from '../../utils/test.utils.js';
import {
	createConnectionAndInviteUserWithConnectionEditOnly,
	createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection,
	createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions,
} from '../../utils/user-with-different-permissions-utils.js';

let app: INestApplication;
let _testUtils: TestUtils;
let currentTest: string;

test.before(async () => {
	process.env.CEDAR_AUTHORIZATION_ENABLED = 'true';
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
		delete process.env.CEDAR_AUTHORIZATION_ENABLED;
		await app.close();
	} catch (e) {
		console.error('After tests error ' + e);
	}
});

//****************************** GET /connection/diagram/:connectionId — separate Cedar permission ******************************

currentTest = 'GET /connection/diagram/:connectionId';

test.serial(
	`${currentTest} should allow admin group user (wildcard policy) to fetch the diagram via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const diagramResponse = await request(app.getHttpServer())
				.get(`/connection/diagram/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Accept', 'application/json');

			t.is(diagramResponse.status, 200);
			t.is(diagramResponse.body.connectionId, connections.firstId);
			t.is(typeof diagramResponse.body.diagram, 'string');
			t.true(diagramResponse.body.diagram.startsWith('erDiagram'));
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} should allow user with connection edit access to fetch the diagram via Cedar`,
	async (t) => {
		try {
			const testData = await createConnectionAndInviteUserWithConnectionEditOnly(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const diagramResponse = await request(app.getHttpServer())
				.get(`/connection/diagram/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Accept', 'application/json');

			t.is(diagramResponse.status, 200);
			t.is(diagramResponse.body.connectionId, connections.firstId);
			t.is(typeof diagramResponse.body.diagram, 'string');
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} should reject readonly group user (no diagram permission) with 403 via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const {
				connections,
				users: { simpleUserToken },
			} = testData;

			const diagramResponse = await request(app.getHttpServer())
				.get(`/connection/diagram/${connections.firstId}`)
				.set('Cookie', simpleUserToken)
				.set('Accept', 'application/json');

			t.is(diagramResponse.status, 403);
			t.is(JSON.parse(diagramResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(`${currentTest} should reject user not in connection's groups with 403 via Cedar`, async (t) => {
	try {
		const testData =
			await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
		const {
			connections,
			users: { simpleUserToken },
		} = testData;

		// User is only in first connection's group, NOT in second connection
		const diagramResponse = await request(app.getHttpServer())
			.get(`/connection/diagram/${connections.secondId}`)
			.set('Cookie', simpleUserToken)
			.set('Accept', 'application/json');

		t.is(diagramResponse.status, 403);
		t.is(JSON.parse(diagramResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should reject unauthenticated requests with 401`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const { connections } = testData;

		const diagramResponse = await request(app.getHttpServer())
			.get(`/connection/diagram/${connections.firstId}`)
			.set('Accept', 'application/json');

		t.is(diagramResponse.status, 401);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

test.serial(`${currentTest} should reject requests with a non-existent connection id with 403`, async (t) => {
	try {
		const testData = await createConnectionsAndInviteNewUserInAdminGroupOfFirstConnection(app);
		const {
			users: { simpleUserToken },
		} = testData;

		const fakeConnectionId = faker.string.uuid();
		const diagramResponse = await request(app.getHttpServer())
			.get(`/connection/diagram/${fakeConnectionId}`)
			.set('Cookie', simpleUserToken)
			.set('Accept', 'application/json');

		t.is(diagramResponse.status, 403);
		t.is(JSON.parse(diagramResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

//****************************** Raw Cedar policy: connection:diagram is separate from connection:edit ******************************

test.serial(
	`${currentTest} should allow access when raw Cedar policy grants only connection:diagram (no connection:edit) via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:diagram",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			// User can fetch diagram with only connection:diagram permission
			const diagramResponse = await request(app.getHttpServer())
				.get(`/connection/diagram/${connectionId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Accept', 'application/json');

			t.is(diagramResponse.status, 200);
			t.is(diagramResponse.body.connectionId, connectionId);

			// But the same user cannot edit the connection (no connection:edit)
			const updateConnectionDto = {
				type: 'postgres',
				host: faker.internet.domainName(),
				port: 5432,
				username: 'updated',
				password: 'updated',
				database: 'updated',
				title: 'updated',
			};
			const updateConnectionResponse = await request(app.getHttpServer())
				.put(`/connection/${connectionId}`)
				.send(updateConnectionDto)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(updateConnectionResponse.status, 403);
			t.is(JSON.parse(updateConnectionResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);

test.serial(
	`${currentTest} should reject access when raw Cedar policy grants only connection:read (no connection:diagram) via Cedar`,
	async (t) => {
		try {
			const testData =
				await createConnectionsAndInviteNewUserInNewGroupWithTableDifferentConnectionGroupReadOnlyPermissions(app);
			const connectionId = testData.connections.firstId;
			const groupId = testData.groups.createdGroupId;

			const cedarPolicy = `permit(\n  principal,\n  action == RocketAdmin::Action::"connection:read",\n  resource == RocketAdmin::Connection::"${connectionId}"\n);`;

			const savePolicyResponse = await request(app.getHttpServer())
				.post(`/connection/cedar-policy/${connectionId}`)
				.send({ cedarPolicy, groupId })
				.set('Cookie', testData.users.adminUserToken)
				.set('Content-Type', 'application/json')
				.set('Accept', 'application/json');

			t.is(savePolicyResponse.status, 201);

			const diagramResponse = await request(app.getHttpServer())
				.get(`/connection/diagram/${connectionId}`)
				.set('Cookie', testData.users.simpleUserToken)
				.set('Accept', 'application/json');

			t.is(diagramResponse.status, 403);
			t.is(JSON.parse(diagramResponse.text).message, Messages.DONT_HAVE_PERMISSIONS);
		} catch (e) {
			console.error(e);
			throw e;
		}
	},
);
