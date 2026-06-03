import test from 'ava';
import { isForbiddenAddress, isHostAllowed } from '../../../src/entities/connection/utils/is-host-allowed.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_IS_SAAS = process.env.IS_SAAS;

function setEnv(key: 'NODE_ENV' | 'IS_SAAS', value: string | undefined): void {
	if (value === undefined) {
		delete process.env[key];
	} else {
		process.env[key] = value;
	}
}

function enableSaaSHostCheck(): void {
	process.env.NODE_ENV = 'development'; // isTest() => false
	process.env.IS_SAAS = '1'; // isSaaS() => true
}

test.afterEach.always(() => {
	setEnv('NODE_ENV', ORIGINAL_NODE_ENV);
	setEnv('IS_SAAS', ORIGINAL_IS_SAAS);
});

const FORBIDDEN_ADDRESSES = [
	['127.0.0.1', 'IPv4 loopback'],
	['::1', 'IPv6 loopback'],
	['169.254.169.254', 'cloud metadata endpoint'],
	['169.254.1.1', 'IPv4 link-local'],
	['10.5.5.5', 'private 10.0.0.0/8'],
	['172.16.0.1', 'private 172.16.0.0/12'],
	['192.168.1.10', 'private 192.168.0.0/16'],
	['0.0.0.0', '"this host"'],
	['fe80::1', 'IPv6 link-local'],
	['fd00::1234', 'IPv6 unique-local'],
	['::ffff:127.0.0.1', 'IPv4-mapped IPv6 loopback (normalized)'],
	['::ffff:169.254.169.254', 'IPv4-mapped IPv6 metadata (normalized)'],
] as const;

for (const [address, label] of FORBIDDEN_ADDRESSES) {
	test(`isForbiddenAddress blocks ${address} (${label})`, (t) => {
		t.true(isForbiddenAddress(address));
	});
}

const ALLOWED_ADDRESSES = [
	['8.8.8.8', 'public IPv4 (Google DNS)'],
	['93.184.216.34', 'public IPv4 (example.com)'],
	['1.1.1.1', 'public IPv4 (Cloudflare)'],
	['2606:4700:4700::1111', 'public IPv6 (Cloudflare)'],
] as const;

for (const [address, label] of ALLOWED_ADDRESSES) {
	test(`isForbiddenAddress allows ${address} (${label})`, (t) => {
		t.false(isForbiddenAddress(address));
	});
}

test.serial('SaaS: blocks IPv4 loopback host', async (t) => {
	enableSaaSHostCheck();
	t.false(await isHostAllowed({ type: 'postgres', host: '127.0.0.1' }));
});

test.serial('SaaS: blocks IPv6 loopback host', async (t) => {
	enableSaaSHostCheck();
	t.false(await isHostAllowed({ type: 'postgres', host: '::1' }));
});

test.serial('SaaS: blocks cloud metadata endpoint host', async (t) => {
	enableSaaSHostCheck();
	t.false(await isHostAllowed({ type: 'postgres', host: '169.254.169.254' }));
});

test.serial('SaaS: blocks private network host', async (t) => {
	enableSaaSHostCheck();
	t.false(await isHostAllowed({ type: 'postgres', host: '10.0.0.5' }));
});

test.serial('SaaS: allows a public host', async (t) => {
	enableSaaSHostCheck();
	t.true(await isHostAllowed({ type: 'postgres', host: '8.8.8.8' }));
});

test.serial('SaaS: SSH tunnel to an internal DB host via a public SSH endpoint is allowed', async (t) => {
	enableSaaSHostCheck();
	t.true(await isHostAllowed({ type: 'postgres', ssh: true, host: '127.0.0.1', sshHost: '8.8.8.8' }));
});

test.serial('SaaS: SSH tunnel through an internal SSH endpoint is blocked', async (t) => {
	enableSaaSHostCheck();
	t.false(await isHostAllowed({ type: 'postgres', ssh: true, host: '127.0.0.1', sshHost: '10.0.0.5' }));
});

test.serial('SaaS: agent connections bypass the host check', async (t) => {
	enableSaaSHostCheck();
	t.true(await isHostAllowed({ type: 'agent_postgres', host: '127.0.0.1' }));
});

test.serial('self-hosted (non-SaaS): host check is bypassed even for internal hosts', async (t) => {
	process.env.NODE_ENV = 'development'; // isTest() => false
	delete process.env.IS_SAAS; // isSaaS() => false
	t.true(await isHostAllowed({ type: 'postgres', host: '127.0.0.1' }));
});

test.serial('test mode: host check is bypassed even for internal hosts', async (t) => {
	process.env.NODE_ENV = 'test'; // isTest() => true
	process.env.IS_SAAS = '1';
	t.true(await isHostAllowed({ type: 'postgres', host: '127.0.0.1' }));
});
