/* eslint-disable @typescript-eslint/no-unused-vars */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import test from 'ava';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ApplicationModule } from '../../../src/app.module.js';
import { BaseType } from '../../../src/common/data-injection.tokens.js';
import { generateCedarPolicyForGroup } from '../../../src/entities/cedar-authorization/cedar-policy-generator.js';
import { ConnectionEntity } from '../../../src/entities/connection/connection.entity.js';
import { GroupEntity } from '../../../src/entities/group/group.entity.js';
import { AccessLevelEnum } from '../../../src/enums/access-level.enum.js';
import { ValidationException } from '../../../src/exceptions/custom-exceptions/validation-exception.js';
import { Cacher } from '../../../src/helpers/cache/cacher.js';
import { DatabaseModule } from '../../../src/shared/database/database.module.js';
import { DatabaseService } from '../../../src/shared/database/database.service.js';
import { registerUserAndReturnUserInfo } from '../../utils/register-user-and-return-user-info.js';
import { setSaasEnvVariable } from '../../utils/set-saas-env-variable.js';
import { TestUtils } from '../../utils/test.utils.js';

let app: INestApplication;
let _testUtils: TestUtils;

test.before(async () => {
	setSaasEnvVariable();
	const moduleFixture = await Test.createTestingModule({
		imports: [ApplicationModule, DatabaseModule],
		providers: [DatabaseService, TestUtils],
	}).compile();
	_testUtils = moduleFixture.get<TestUtils>(TestUtils);

	app = moduleFixture.createNestApplication() as any;
	app.use(cookieParser());
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

const VALID_CONNECTIONS_COUNT = 5;
const INVALID_CONNECTIONS_COUNT = 200;
const TOTAL_CONNECTIONS_COUNT = VALID_CONNECTIONS_COUNT + INVALID_CONNECTIONS_COUNT;

test.serial(
	`> GET /connections > should return all connections without OOM when user has ${TOTAL_CONNECTIONS_COUNT} connections (${VALID_CONNECTIONS_COUNT} valid + ${INVALID_CONNECTIONS_COUNT} invalid)`,
	async (t) => {
		const { token, email, password } = await registerUserAndReturnUserInfo(app);

		const dataSource = app.get<DataSource>(BaseType.DATA_SOURCE);
		const connectionRepository = dataSource.getRepository(ConnectionEntity);
		const groupRepository = dataSource.getRepository(GroupEntity);

		// Resolve user from token
		const userResponse = await request(app.getHttpServer())
			.get('/user')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');
		t.is(userResponse.status, 200);
		const user = userResponse.body;

		// Build all connection entities
		const connections: ConnectionEntity[] = [];

		for (let i = 0; i < VALID_CONNECTIONS_COUNT; i++) {
			const conn = connectionRepository.create({
				title: `Valid Connection ${i + 1}`,
				type: 'postgres' as any,
				host: 'testPg-e2e-testing',
				port: 5432,
				username: 'postgres',
				password: '123',
				database: 'postgres',
				ssh: false,
				masterEncryption: false,
				author: { id: user.id } as any,
				company: { id: user.company.id } as any,
			});
			connections.push(conn);
		}

		for (let i = 0; i < INVALID_CONNECTIONS_COUNT; i++) {
			const conn = connectionRepository.create({
				title: `Invalid Connection ${i + 1}`,
				type: 'postgres' as any,
				host: `nonexistent-host-${i}.invalid`,
				port: 5432,
				username: 'fakeuser',
				password: 'fakepass',
				database: 'fakedb',
				ssh: false,
				masterEncryption: false,
				author: { id: user.id } as any,
				company: { id: user.company.id } as any,
			});
			connections.push(conn);
		}

		// Save all connections in bulk
		const savedConnections = await connectionRepository.save(connections);

		// Create admin groups with cedar policies for each connection
		const groups: GroupEntity[] = savedConnections.map((conn) => {
			const group = groupRepository.create({
				title: 'Admin',
				isMain: true,
				connection: conn,
				users: [{ id: user.id } as any],
			});
			group.cedarPolicy = generateCedarPolicyForGroup(conn.id, true, {
				connection: { connectionId: conn.id, accessLevel: AccessLevelEnum.edit },
				group: { groupId: '', accessLevel: AccessLevelEnum.edit },
				tables: [],
			});
			return group;
		});

		await groupRepository.save(groups);

		// Fetch all connections - this should not cause OOM
		const findAllResponse = await request(app.getHttpServer())
			.get('/connections')
			.set('Cookie', token)
			.set('Content-Type', 'application/json')
			.set('Accept', 'application/json');

		t.is(findAllResponse.status, 200);
		t.is(findAllResponse.body.connections.length, TOTAL_CONNECTIONS_COUNT);
		t.is(findAllResponse.body.connectionsCount, TOTAL_CONNECTIONS_COUNT);
	},
);
