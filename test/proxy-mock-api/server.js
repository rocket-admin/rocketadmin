const http = require('http');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.MOCK_API_PORT || 3333;
const EXPECTED_API_KEY = process.env.PROXY_API_KEY || 'test-proxy-api-key';

// Client → proxy credential pattern.
// Tests use unique usernames like `proxy_user_<token>` so each test gets its
// own derived companyId (and therefore its own limiter slot).
const PROXY_USERNAME_PREFIX = process.env.PROXY_CLIENT_USERNAME_PREFIX || 'proxy_user';
const PROXY_DATABASE = process.env.PROXY_CLIENT_DATABASE || 'postgres';

function deriveCompanyId(username) {
	// Single-username case (e.g. plain "proxy_user") keeps the legacy id so existing
	// tests/clients that don't randomize still hit a stable companyId.
	if (username === PROXY_USERNAME_PREFIX) {
		return 'test-company-001';
	}
	const hash = crypto.createHash('sha1').update(username).digest('hex').slice(0, 12);
	return `test-company-${hash}`;
}

function deriveConnectionId(username) {
	if (username === PROXY_USERNAME_PREFIX) {
		return 'test-connection-001';
	}
	const hash = crypto.createHash('sha1').update(username).digest('hex').slice(0, 12);
	return `test-connection-${hash}`;
}

// Upstream connection info returned when the proxy asks for the above client credentials
const TEST_CONNECTION = {
	connectionId: 'test-connection-001',
	host: process.env.UPSTREAM_PG_HOST || 'testPg-proxy-e2e',
	port: parseInt(process.env.UPSTREAM_PG_PORT || '5432', 10),
	database: process.env.UPSTREAM_PG_DATABASE || 'postgres',
	username: process.env.UPSTREAM_PG_USERNAME || 'postgres',
	password: process.env.UPSTREAM_PG_PASSWORD || 'proxy_test_123',
	companyId: 'test-company-001',
	subscriptionLevel: 'TEAM_PLAN',
};

// Configurable subscription level — e2e tests can change this at runtime
// to test throttling / frozen plan behaviour.
let currentSubscriptionLevel = TEST_CONNECTION.subscriptionLevel;

// The proxy keys throttling off hostedDbPlan, not subscriptionLevel. The
// product reality is two-tier — paid (unlimited) and free (throttled) — plus
// the admin-initiated `frozen` override and a TEST_TINY_PLAN used to drive
// the bucket to exhaustion quickly. Anything else is treated as paid so
// positive-path tests run unthrottled.
function deriveHostedDbPlan(level) {
	if (level === 'frozen') return 'frozen';
	if (level === 'TEST_TINY_PLAN') return 'TEST_TINY_PLAN';
	if (level === 'HOSTED_DB_FREE' || level === 'FREE_PLAN') return 'HOSTED_DB_FREE';
	return 'HOSTED_DB_PAID';
}

// Store received usage reports so tests can verify them via GET /api/proxy/usage-reports
const usageReports = [];

const server = http.createServer((req, res) => {
	// Health check endpoint (no auth required)
	if (req.url === '/healthz') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ status: 'ok' }));
		return;
	}

	const parsedUrl = url.parse(req.url, true);

	// Test-only: configure subscription level at runtime (no auth required)
	if (req.method === 'PUT' && parsedUrl.pathname === '/api/test/subscription-level') {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			const parsed = JSON.parse(body);
			currentSubscriptionLevel = parsed.subscriptionLevel;
			console.log(`[mock-api] Subscription level changed to: ${currentSubscriptionLevel}`);
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ ok: true, subscriptionLevel: currentSubscriptionLevel }));
		});
		return;
	}

	// Test-only: get collected usage reports (no auth required)
	if (req.method === 'GET' && parsedUrl.pathname === '/api/test/usage-reports') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(usageReports));
		return;
	}

	// Test-only: clear collected usage reports (no auth required)
	if (req.method === 'DELETE' && parsedUrl.pathname === '/api/test/usage-reports') {
		usageReports.length = 0;
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ ok: true }));
		return;
	}

	const apiKey = req.headers['x-proxy-api-key'];
	if (apiKey !== EXPECTED_API_KEY) {
		res.writeHead(401, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Unauthorized' }));
		return;
	}

	// GET /api/proxy/connections?username=X&database=Y
	if (req.method === 'GET' && parsedUrl.pathname === '/api/proxy/connections') {
		const { username, database } = parsedUrl.query;
		console.log(`[mock-api] GET connection: username=${username}, database=${database}`);

		const usernameMatches =
			username === PROXY_USERNAME_PREFIX ||
			(typeof username === 'string' && username.startsWith(PROXY_USERNAME_PREFIX + '_'));

		if (usernameMatches && database === PROXY_DATABASE) {
			const companyId = deriveCompanyId(username);
			const connectionId = deriveConnectionId(username);
			const hostedDbPlan = deriveHostedDbPlan(currentSubscriptionLevel);
			console.log(
				`[mock-api] -> returning connection, companyId=${companyId} connectionId=${connectionId} subscriptionLevel=${currentSubscriptionLevel} hostedDbPlan=${hostedDbPlan}`,
			);
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					...TEST_CONNECTION,
					connectionId,
					companyId,
					subscriptionLevel: currentSubscriptionLevel,
					hostedDbPlan,
				}),
			);
		} else {
			console.log(
				`[mock-api] -> 404: username/database mismatch (expected ${PROXY_USERNAME_PREFIX}[_*]/${PROXY_DATABASE})`,
			);
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Connection not found' }));
		}
		return;
	}

	// POST /api/proxy/usage
	if (req.method === 'POST' && parsedUrl.pathname === '/api/proxy/usage') {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			console.log(`[mock-api] POST usage: ${body}`);
			try {
				const reports = JSON.parse(body);
				if (Array.isArray(reports)) {
					usageReports.push(...reports);
				} else {
					usageReports.push(reports);
				}
			} catch (e) {
				console.error(`[mock-api] Failed to parse usage body: ${e.message}`);
			}
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ ok: true }));
		});
		return;
	}

	res.writeHead(404, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
	console.log(`[mock-api] Proxy mock API listening on port ${PORT}`);
});
