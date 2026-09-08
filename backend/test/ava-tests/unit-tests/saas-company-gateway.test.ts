import { Logger, type LoggerService } from '@nestjs/common';
import test from 'ava';

// The gateway reads IS_SAAS / MICROSERVICE_JWT_SECRET / SAAS_URL through
// appConfig — set them before the module (and its appConfig import) loads.
process.env.IS_SAAS = '1';
process.env.MICROSERVICE_JWT_SECRET = 'unit-test-secret';
process.env.SAAS_URL = 'http://saas.unit.test';

const { SaasCompanyGatewayService } = await import(
	'../../../src/microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js'
);
const { normalizeSaasPath } = await import(
	'../../../src/microservices/gateways/saas-gateway.ts/base-saas-gateway.service.js'
);

const COMPANY_ID = 'b3363e0b-0101-4bc8-86cd-02516d407b62';

// Every reason a company lookup comes back empty ends up as a user-facing
// "Company not found" in the callers, so the gateway must leave the real reason
// (upstream status + message) in the log. These tests pin those log lines.
const captured: { level: string; message: string }[] = [];
const capturingLogger: LoggerService = {
	log: (message: unknown) => captured.push({ level: 'log', message: String(message) }),
	warn: (message: unknown) => captured.push({ level: 'warn', message: String(message) }),
	error: (message: unknown) => captured.push({ level: 'error', message: String(message) }),
	debug: () => {},
	verbose: () => {},
};
Logger.overrideLogger(capturingLogger);

const realFetch = globalThis.fetch;

function stubFetch(impl: (url: string) => Promise<Response>): void {
	globalThis.fetch = impl as unknown as typeof fetch;
}

test.afterEach.always(() => {
	globalThis.fetch = realFetch;
	captured.length = 0;
});

// global fetch + shared log capture are mutated per test -> serial only
test.serial('2xx with company data -> returns the body, nothing logged', async (t) => {
	const seenUrls: string[] = [];
	stubFetch(async (url) => {
		seenUrls.push(url);
		return new Response(
			JSON.stringify({ id: COMPANY_ID, createdAt: '2026-09-08T11:00:00.000Z', updatedAt: '2026-09-08T11:00:00.000Z' }),
			{ status: 200 },
		);
	});
	const gateway = new SaasCompanyGatewayService();
	const info = await gateway.getCompanyInfo(COMPANY_ID);
	t.is(info?.id, COMPANY_ID);
	t.deepEqual(seenUrls, [`http://saas.unit.test/webhook/company/${COMPANY_ID}/`]);
	t.deepEqual(captured, []);
});

test.serial('401 from the saas (secret mismatch) -> null, and the status + saas message are logged', async (t) => {
	stubFetch(async () => new Response(JSON.stringify({ message: 'Invalid token' }), { status: 401 }));
	const gateway = new SaasCompanyGatewayService();
	const info = await gateway.getCompanyInfo(COMPANY_ID);
	t.is(info, null);
	const warnings = captured.filter((entry) => entry.level === 'warn').map((entry) => entry.message);
	t.true(
		warnings.some((message) => message.includes('HTTP 401') && message.includes('Invalid token')),
		`expected the upstream status and message in the log, got: ${JSON.stringify(warnings)}`,
	);
	t.true(warnings.some((message) => message.includes(COMPANY_ID) && message.includes('COMPANY_NOT_FOUND')));
});

test.serial('404 from the saas (row missing there) -> null, logged with the company id and HTTP 404', async (t) => {
	stubFetch(
		async () =>
			new Response(JSON.stringify({ message: 'Company not found. Please contact our support team' }), { status: 404 }),
	);
	const gateway = new SaasCompanyGatewayService();
	t.is(await gateway.getCompanyInfo(COMPANY_ID), null);
	const warnings = captured.filter((entry) => entry.level === 'warn').map((entry) => entry.message);
	t.true(warnings.some((message) => message.includes(`company ${COMPANY_ID}`) && message.includes('HTTP 404')));
});

test.serial('2xx without the expected fields -> null, logged as an unexpected body', async (t) => {
	stubFetch(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
	const gateway = new SaasCompanyGatewayService();
	t.is(await gateway.getCompanyInfo(COMPANY_ID), null);
	const warnings = captured.filter((entry) => entry.level === 'warn').map((entry) => entry.message);
	t.true(warnings.some((message) => message.includes('unexpected body') && message.includes('success')));
});

test.serial(
	'200 with an HTML page (SAAS_URL hitting an SPA fallback) -> null, content type + snippet logged as error',
	async (t) => {
		stubFetch(
			async () =>
				new Response('<!doctype html><html><head><title>SiteNova</title></head><body></body></html>', {
					status: 200,
					headers: { 'content-type': 'text/html; charset=utf-8' },
				}),
		);
		const gateway = new SaasCompanyGatewayService();
		t.is(await gateway.getCompanyInfo(COMPANY_ID), null);
		const errors = captured.filter((entry) => entry.level === 'error').map((entry) => entry.message);
		t.true(
			errors.some(
				(message) =>
					message.includes('HTTP 200') &&
					message.includes('text/html') &&
					message.includes('<!doctype html>') &&
					message.includes('http://saas.unit.test'),
			),
			`expected content type, snippet and SAAS_URL in the error log, got: ${JSON.stringify(errors)}`,
		);
	},
);

test.serial('200 with an empty body -> null, reported as empty', async (t) => {
	stubFetch(async () => new Response('', { status: 200 }));
	const gateway = new SaasCompanyGatewayService();
	t.is(await gateway.getCompanyInfo(COMPANY_ID), null);
	t.true(captured.some((entry) => entry.level === 'error' && entry.message.includes('the body is empty')));
});

test.serial('fetch throwing (SAAS_URL unreachable) -> rethrows, and the target base URL is logged', async (t) => {
	stubFetch(async () => {
		throw new TypeError('fetch failed');
	});
	const gateway = new SaasCompanyGatewayService();
	await t.throwsAsync(gateway.getCompanyInfo(COMPANY_ID), { message: 'fetch failed' });
	const errors = captured.filter((entry) => entry.level === 'error').map((entry) => entry.message);
	t.true(errors.some((message) => message.includes('http://saas.unit.test') && message.includes('fetch failed')));
});

test('normalizeSaasPath replaces ids and drops the query so Sentry groups by route shape', (t) => {
	t.is(normalizeSaasPath(`/webhook/company/${COMPANY_ID}/`), '/webhook/company/:id/');
	t.is(normalizeSaasPath(`/webhook/company/${COMPANY_ID}/domain/?x=1`), '/webhook/company/:id/domain/');
	t.is(normalizeSaasPath('/webhook/company/domain/app.example.com/'), '/webhook/company/domain/app.example.com/');
});
