import test from 'ava';
import { getSsrfSafeRequestConfig, ssrfGuardLookup } from '../../../src/helpers/validators/ssrf-safe-http.js';

// The SSRF guard is only meant to engage in SaaS mode (self-hosted owns its network). isSaaS()/
// isTest() read env live, so we toggle env per test. IP literals are resolved by dns.lookup with
// no network access, so the guard's blocking behaviour is exercised deterministically.
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

function lookup(host: string): Promise<{ address: string; family: number }> {
	return new Promise((resolve, reject) => {
		ssrfGuardLookup(host, {}, (err, address, family) => {
			if (err) {
				reject(err);
			} else {
				resolve({ address: address as string, family: family ?? 0 });
			}
		});
	});
}

// --- the validating lookup blocks internal targets, allows public ones --------------------------

for (const host of ['127.0.0.1', '::1', '169.254.169.254', '10.0.0.5', '192.168.1.1', '::ffff:127.0.0.1']) {
	test(`ssrfGuardLookup rejects forbidden address ${host}`, async (t) => {
		await t.throwsAsync(() => lookup(host), { message: /SSRF guard/ });
	});
}

test('ssrfGuardLookup resolves a public IPv4 address', async (t) => {
	const { address } = await lookup('8.8.8.8');
	t.is(address, '8.8.8.8');
});

test('ssrfGuardLookup resolves a public IPv6 address', async (t) => {
	const { address } = await lookup('2606:4700:4700::1111');
	t.is(address, '2606:4700:4700::1111');
});

// --- gating: pinning config is applied only in SaaS, non-test ----------------------------------

test.serial('getSsrfSafeRequestConfig returns pinning agents + guards in SaaS mode', (t) => {
	process.env.NODE_ENV = 'development'; // isTest() => false
	process.env.IS_SAAS = '1'; // isSaaS() => true
	const config = getSsrfSafeRequestConfig();
	t.truthy(config.httpAgent);
	t.truthy(config.httpsAgent);
	t.is(config.maxRedirects, 0);
	t.is(typeof config.timeout, 'number');
});

test.serial('getSsrfSafeRequestConfig is a no-op for self-hosted (non-SaaS)', (t) => {
	process.env.NODE_ENV = 'development';
	delete process.env.IS_SAAS;
	t.deepEqual(getSsrfSafeRequestConfig(), {});
});

test.serial('getSsrfSafeRequestConfig is a no-op in test mode', (t) => {
	process.env.NODE_ENV = 'test';
	process.env.IS_SAAS = '1';
	t.deepEqual(getSsrfSafeRequestConfig(), {});
});
