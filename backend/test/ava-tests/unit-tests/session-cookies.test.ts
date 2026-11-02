import test from 'ava';
import {
	extractSessionTokens,
	getSessionTokenFromRequest,
	getSessionTokensFromRequest,
	readIssuedAt,
	selectSessionToken,
} from '../../../src/authorization/utils/session-token.js';
import {
	getCookieDomainOptions,
	matchCookieDomain,
	parseCookieDomains,
} from '../../../src/entities/user/utils/get-cookie-domain-options.js';
import { clearSessionCookies } from '../../../src/entities/user/utils/session-cookies.js';

// Plan 84: one session cookie identity per browser, and a logout that removes every copy.

function fakeJwt(payload: Record<string, unknown>): string {
	const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${header}.${body}.signature`;
}

const DOMAINS = ['rocketadmin.com', 'sitenova.com'];

test('parseCookieDomains reads a single value and a comma-separated list', (t) => {
	t.deepEqual(parseCookieDomains(undefined), []);
	t.deepEqual(parseCookieDomains(''), []);
	t.deepEqual(parseCookieDomains('rocketadmin.com'), ['rocketadmin.com']);
	t.deepEqual(parseCookieDomains(' .Rocketadmin.com , sitenova.com,'), DOMAINS);
});

test('matchCookieDomain matches the hostname itself and dotted subdomains only', (t) => {
	t.is(matchCookieDomain('app.sitenova.com', DOMAINS), 'sitenova.com');
	t.is(matchCookieDomain('rocket.sitenova.com', DOMAINS), 'sitenova.com');
	t.is(matchCookieDomain('sitenova.com', DOMAINS), 'sitenova.com');
	t.is(matchCookieDomain('APP.ROCKETADMIN.COM', DOMAINS), 'rocketadmin.com');
	t.is(matchCookieDomain('sitenova.com.evil.net', DOMAINS), undefined);
	t.is(matchCookieDomain('notsitenova.com', DOMAINS), undefined);
	t.is(matchCookieDomain('localhost', DOMAINS), undefined);
	t.is(matchCookieDomain(undefined, DOMAINS), undefined);
	t.is(matchCookieDomain('app.sitenova.com', []), undefined);
});

test('getCookieDomainOptions returns the Domain option or undefined', (t) => {
	t.deepEqual(getCookieDomainOptions('rocket.sitenova.com', DOMAINS), { domain: 'sitenova.com' });
	t.is(getCookieDomainOptions('rocket.sitenova.com', []), undefined);
	t.is(getCookieDomainOptions('rocket.sitenova.com', ['rocketadmin.com']), undefined);
});

test('extractSessionTokens returns every value of the session cookie in header order', (t) => {
	t.deepEqual(extractSessionTokens(undefined), []);
	t.deepEqual(extractSessionTokens(''), []);
	t.deepEqual(extractSessionTokens('a=1; rocketadmin_cookie=A; b=2; rocketadmin_cookie=B'), ['A', 'B']);
	t.deepEqual(extractSessionTokens('rocketadmin_cookie=; rocketadmin_cookie=B'), ['B']);
	t.deepEqual(extractSessionTokens('rocketadmin_cookie="quoted"'), ['quoted']);
	t.deepEqual(extractSessionTokens('rocketadmin_cookie=a%2Eb'), ['a.b']);
	t.deepEqual(extractSessionTokens('rocketadmin_cookie_other=X; rocketadmin_cookie=A'), ['A']);
	t.deepEqual(extractSessionTokens(['rocketadmin_cookie=A', 'rocketadmin_cookie=B']), ['A', 'B']);
});

test('readIssuedAt reads the iat claim without a signature check', (t) => {
	t.is(readIssuedAt(fakeJwt({ iat: 1700000000 })), 1700000000);
	t.is(readIssuedAt(fakeJwt({ sub: 'x' })), null);
	t.is(readIssuedAt('not-a-jwt'), null);
	t.is(readIssuedAt('a.!!!.c'), null);
});

test('selectSessionToken prefers the newest iat whatever the browser order', (t) => {
	const older = fakeJwt({ iat: 1700000000 });
	const newer = fakeJwt({ iat: 1700000500 });
	t.is(selectSessionToken([]), undefined);
	t.is(selectSessionToken([older]), older);
	t.is(selectSessionToken([older, newer]), newer);
	t.is(selectSessionToken([newer, older]), newer);
});

test('selectSessionToken keeps the browser order on a tie and ranks unreadable tokens last', (t) => {
	const first = fakeJwt({ iat: 1700000000, n: 1 });
	const second = fakeJwt({ iat: 1700000000, n: 2 });
	t.is(selectSessionToken([first, second]), first);
	t.is(selectSessionToken(['garbage', second]), second);
	t.is(selectSessionToken([second, 'garbage']), second);
	t.is(selectSessionToken(['garbage-1', 'garbage-2']), 'garbage-1');
});

test('getSessionTokensFromRequest reads the raw header, drops duplicates and falls back to req.cookies', (t) => {
	const older = fakeJwt({ iat: 1 });
	const newer = fakeJwt({ iat: 2 });
	t.deepEqual(
		getSessionTokensFromRequest({
			headers: { cookie: `rocketadmin_cookie=${older}; rocketadmin_cookie=${newer}; rocketadmin_cookie=${older}` },
			cookies: { rocketadmin_cookie: older },
		}),
		[older, newer],
	);
	t.deepEqual(getSessionTokensFromRequest({ cookies: { rocketadmin_cookie: older } }), [older]);
	t.deepEqual(getSessionTokensFromRequest({ headers: {}, cookies: {} }), []);
	t.deepEqual(getSessionTokensFromRequest({}), []);
});

test('getSessionTokenFromRequest authenticates with the newest token', (t) => {
	const older = fakeJwt({ iat: 1 });
	const newer = fakeJwt({ iat: 2 });
	t.is(
		getSessionTokenFromRequest({
			headers: { cookie: `rocketadmin_cookie=${older}; rocketadmin_cookie=${newer}` },
		}),
		newer,
	);
	t.is(getSessionTokenFromRequest({ cookies: { rocketadmin_cookie: older } }), older);
	t.is(getSessionTokenFromRequest({}), undefined);
});

interface CookieCall {
	name: string;
	value: unknown;
	options: Record<string, unknown>;
}

function fakeResponse(): { cookies: CookieCall[]; headers: Record<string, string>; response: unknown } {
	const cookies: CookieCall[] = [];
	const headers: Record<string, string> = {};
	const response = {
		cookie(name: string, value: unknown, options: Record<string, unknown>) {
			cookies.push({ name, value, options });
			return response;
		},
		setHeader(name: string, value: string) {
			headers[name] = value;
		},
	};
	return { cookies, headers, response };
}

test('clearSessionCookies expires both cookies in both scopes and sends Clear-Site-Data on a matched host', (t) => {
	const { cookies, headers, response } = fakeResponse();
	clearSessionCookies(response as never, 'rocket.sitenova.com', DOMAINS);

	t.is(cookies.length, 4);
	t.deepEqual(
		cookies.map((c) => [c.name, c.options.domain]),
		[
			['rocketadmin_cookie', undefined],
			['rocketadmin_authenticated', undefined],
			['rocketadmin_cookie', 'sitenova.com'],
			['rocketadmin_authenticated', 'sitenova.com'],
		],
	);
	for (const c of cookies) {
		t.is(c.value, '');
		t.is((c.options.expires as Date).getTime(), 0);
	}
	const jwtClears = cookies.filter((c) => c.name === 'rocketadmin_cookie');
	t.true(jwtClears.every((c) => c.options.httpOnly === true && c.options.secure === true));
	t.is(headers['Clear-Site-Data'], '"cookies"');
});

test('clearSessionCookies stays host-only and sends no Clear-Site-Data on an unmatched host', (t) => {
	const { cookies, headers, response } = fakeResponse();
	clearSessionCookies(response as never, 'admin.customer.internal', DOMAINS);

	t.deepEqual(
		cookies.map((c) => [c.name, c.options.domain]),
		[
			['rocketadmin_cookie', undefined],
			['rocketadmin_authenticated', undefined],
		],
	);
	t.is(headers['Clear-Site-Data'], undefined);
});

test('clearSessionCookies without a configured domain (self-hosted) never sends Clear-Site-Data', (t) => {
	const { cookies, headers, response } = fakeResponse();
	clearSessionCookies(response as never, 'rocket.sitenova.com', []);
	t.is(cookies.length, 2);
	t.is(headers['Clear-Site-Data'], undefined);
});
