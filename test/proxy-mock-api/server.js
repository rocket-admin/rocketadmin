const http = require('http');

const PORT = process.env.MOCK_API_PORT || 3333;
const EXPECTED_API_KEY = process.env.PROXY_API_KEY || 'test-proxy-api-key';

// Connection info for the test Postgres behind the proxy
const TEST_CONNECTION = {
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

  // GET /api/proxy/connections/:id
  const connMatch = req.url.match(/^\/api\/proxy\/connections\/(.+)$/);
  if (req.method === 'GET' && connMatch) {
    const connectionId = connMatch[1];
    console.log(`[mock-api] GET connection: ${connectionId}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(TEST_CONNECTION));
    return;
  }

  // POST /api/proxy/usage
  if (req.method === 'POST' && req.url === '/api/proxy/usage') {
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
