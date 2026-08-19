import test from 'ava';
import type { WinstonLogger } from '../../../src/entities/logging/winston-logger.js';

// The gateway reads IS_SAAS / MICROSERVICE_JWT_SECRET / SAAS_URL through
// appConfig — set them before the module (and its appConfig import) loads.
process.env.IS_SAAS = '1';
process.env.MICROSERVICE_JWT_SECRET = 'unit-test-secret';
process.env.SAAS_URL = 'http://saas.unit.test';

const { SaasEmailGatewayService } = await import(
	'../../../src/microservices/gateways/saas-gateway.ts/saas-email-gateway.service.js'
);

const loggerStub = { warn: () => {}, debug: () => {} } as unknown as WinstonLogger;
const realFetch = globalThis.fetch;

function stubFetch(impl: () => Promise<Response>): void {
	globalThis.fetch = impl as unknown as typeof fetch;
}

test.afterEach.always(() => {
	globalThis.fetch = realFetch;
	process.env.IS_SAAS = '1';
});

// env + global fetch are mutated per test -> serial only
test.serial('2xx with delivery result -> ok outcome with mapped fields', async (t) => {
	stubFetch(
		async () =>
			new Response(JSON.stringify({ messageId: '<mid>', accepted: ['a@x.com'], rejected: [] }), { status: 201 }),
	);
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.deepEqual(outcome, {
		ok: true,
		result: { messageId: '<mid>', accepted: ['a@x.com'], rejected: [], deliveryError: undefined },
	});
});

test.serial('2xx best-effort rejection -> ok outcome carrying the saas delivery error', async (t) => {
	stubFetch(
		async () =>
			new Response(JSON.stringify({ messageId: null, accepted: [], rejected: ['a@x.com'], error: 'smtp down' }), {
				status: 201,
			}),
	);
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.true(outcome.ok);
	if (outcome.ok) {
		t.deepEqual(outcome.result.rejected, ['a@x.com']);
		t.is(outcome.result.deliveryError, 'smtp down');
	}
});

test.serial('2xx with non-JSON body -> ok outcome with empty arrays', async (t) => {
	stubFetch(async () => new Response('not json', { status: 201 }));
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.deepEqual(outcome, {
		ok: true,
		result: { messageId: undefined, accepted: [], rejected: [], deliveryError: undefined },
	});
});

test.serial('non-2xx with JSON message -> http status and body message in the reason', async (t) => {
	stubFetch(
		async () =>
			new Response(JSON.stringify({ message: 'Missing email param "link" for email type "reminder"' }), {
				status: 400,
			}),
	);
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.deepEqual(outcome, { ok: false, reason: 'http 400: Missing email param "link" for email type "reminder"' });
});

test.serial('non-2xx without body -> bare http status reason', async (t) => {
	stubFetch(async () => new Response(null, { status: 401 }));
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.deepEqual(outcome, { ok: false, reason: 'http 401' });
});

test.serial('network error -> "fetch failed" reason', async (t) => {
	stubFetch(async () => {
		throw new TypeError('fetch failed');
	});
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.false(outcome.ok);
	if (outcome.ok === false) {
		t.true(outcome.reason.startsWith('fetch failed:'));
	}
});

test.serial('abort timeout -> named timeout reason', async (t) => {
	stubFetch(async () => {
		throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
	});
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.deepEqual(outcome, { ok: false, reason: 'timed out after 4000ms' });
});

test.serial('IS_SAAS unset -> suppression names itself without any network call', async (t) => {
	delete process.env.IS_SAAS;
	let fetchCalled = false;
	stubFetch(async () => {
		fetchCalled = true;
		return new Response(null, { status: 201 });
	});
	const gateway = new SaasEmailGatewayService(loggerStub);
	const outcome = await gateway.sendEmail('reminder', 'a@x.com', {});
	t.deepEqual(outcome, { ok: false, reason: 'suppressed: not SaaS' });
	t.false(fetchCalled);
});
