const http = require('http');
const url = require('url');

const PORT = process.env.MOCK_API_PORT || 3333;
const EXPECTED_API_KEY = process.env.PROXY_API_KEY || 'test-proxy-api-key';

// The client (rocketadmin) connects to the proxy with these credentials.
// The proxy extracts username+database from the startup message and looks up the
// real upstream connection info here.
const PROXY_USERNAME = process.env.PROXY_CLIENT_USERNAME || 'proxy_user';
const PROXY_DATABASE = process.env.PROXY_CLIENT_DATABASE || 'postgres';

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

const server = http.createServer((req, res) => {
  // Health check endpoint (no auth required)
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  const apiKey = req.headers['x-proxy-api-key'];
  if (apiKey !== EXPECTED_API_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // GET /api/proxy/connections?username=X&database=Y
  if (req.method === 'GET' && parsedUrl.pathname === '/api/proxy/connections') {
    const { username, database } = parsedUrl.query;
    console.log(`[mock-api] GET connection: username=${username}, database=${database}`);

    if (username === PROXY_USERNAME && database === PROXY_DATABASE) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(TEST_CONNECTION));
    } else {
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
