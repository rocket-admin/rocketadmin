import { HttpException } from '@nestjs/common';
import test from 'ava';
import { CreateConnectionDs } from '../../../src/entities/connection/application/data-structures/create-connection.ds.js';
import { validateCreateConnectionData } from '../../../src/entities/connection/utils/validate-create-connection-data.js';
import { Messages } from '../../../src/exceptions/text/messages.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_IS_SAAS = process.env.IS_SAAS;

function setEnv(key: 'NODE_ENV' | 'IS_SAAS', value: string | undefined): void {
	if (value === undefined) {
		delete process.env[key];
	} else {
		process.env[key] = value;
	}
}

test.afterEach.always(() => {
	setEnv('NODE_ENV', ORIGINAL_NODE_ENV);
	setEnv('IS_SAAS', ORIGINAL_IS_SAAS);
});

function makeData(params: Record<string, unknown>): CreateConnectionDs {
	return { connection_parameters: params } as unknown as CreateConnectionDs;
}

const VALID_POSTGRES = {
	type: 'postgres',
	host: 'db.example.com',
	port: 5432,
	username: 'user',
	password: 'secret',
	database: 'mydb',
	ssh: false,
};

function thrownMessage(error: unknown): string {
	const response = (error as HttpException).getResponse();
	return typeof response === 'string' ? response : ((response as { message: string }).message ?? '');
}

test('accepts a valid postgres connection', async (t) => {
	t.true(await validateCreateConnectionData(makeData({ ...VALID_POSTGRES })));
});

test('accepts a redis connection without username/database', async (t) => {
	t.true(await validateCreateConnectionData(makeData({ type: 'redis', host: 'cache.example.com', port: 6379 })));
});

test('accepts an agent connection with only a title (no host required)', async (t) => {
	t.true(await validateCreateConnectionData(makeData({ type: 'agent_postgres', title: 'My agent' })));
});

test('rejects a missing connection type', async (t) => {
	const error = await t.throwsAsync(() =>
		validateCreateConnectionData(makeData({ ...VALID_POSTGRES, type: undefined })),
	);
	t.true(thrownMessage(error).includes(Messages.TYPE_MISSING));
});

test('rejects a missing host', async (t) => {
	const error = await t.throwsAsync(() =>
		validateCreateConnectionData(makeData({ ...VALID_POSTGRES, host: undefined })),
	);
	t.true(thrownMessage(error).includes(Messages.HOST_MISSING));
});

test('rejects a missing username for non-redis connections', async (t) => {
	const error = await t.throwsAsync(() =>
		validateCreateConnectionData(makeData({ ...VALID_POSTGRES, username: undefined })),
	);
	t.true(thrownMessage(error).includes(Messages.USERNAME_MISSING));
});

test('rejects a missing database for sql connections', async (t) => {
	const error = await t.throwsAsync(() =>
		validateCreateConnectionData(makeData({ ...VALID_POSTGRES, database: undefined })),
	);
	t.true(thrownMessage(error).includes(Messages.DATABASE_MISSING));
});

test('rejects an agent connection without a title', async (t) => {
	const error = await t.throwsAsync(() => validateCreateConnectionData(makeData({ type: 'agent_postgres' })));
	t.true(thrownMessage(error).includes('Connection title missing'));
});

test('rejects an out-of-range port', async (t) => {
	const error = await t.throwsAsync(() => validateCreateConnectionData(makeData({ ...VALID_POSTGRES, port: 70000 })));
	t.true(thrownMessage(error).includes(Messages.PORT_MISSING));
});

test('rejects a non-numeric port', async (t) => {
	const error = await t.throwsAsync(() =>
		validateCreateConnectionData(makeData({ ...VALID_POSTGRES, port: '5432' as unknown as number })),
	);
	t.true(thrownMessage(error).includes(Messages.PORT_FORMAT_INCORRECT));
});

test('rejects an ssh connection missing ssh host / port / username', async (t) => {
	const error = await t.throwsAsync(() => validateCreateConnectionData(makeData({ ...VALID_POSTGRES, ssh: true })));
	const message = thrownMessage(error);
	t.true(message.includes(Messages.SSH_HOST_MISSING));
	t.true(message.includes(Messages.SSH_PORT_MISSING));
	t.true(message.includes(Messages.SSH_USERNAME_MISSING));
});

test('accepts an ssh connection with all ssh parameters', async (t) => {
	t.true(
		await validateCreateConnectionData(
			makeData({ ...VALID_POSTGRES, ssh: true, sshHost: 'bastion.example.com', sshPort: 22, sshUsername: 'tunnel' }),
		),
	);
});

test.serial('rejects a malformed hostname when not in test mode', async (t) => {
	process.env.NODE_ENV = 'development'; // isTest() => false, so FQDN/IP validation runs
	delete process.env.IS_SAAS; // self-hosted => isHostAllowed bypassed, isolating the format check
	const error = await t.throwsAsync(() =>
		validateCreateConnectionData(makeData({ ...VALID_POSTGRES, host: 'not a valid host!!' })),
	);
	t.true(thrownMessage(error).includes(Messages.HOST_NAME_INVALID));
});

test.serial('accepts an IP-literal hostname when not in test mode', async (t) => {
	process.env.NODE_ENV = 'development';
	delete process.env.IS_SAAS;
	t.true(await validateCreateConnectionData(makeData({ ...VALID_POSTGRES, host: '203.0.113.10' })));
});
