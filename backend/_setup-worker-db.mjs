import path from 'node:path';
import process from 'node:process';
import knex from 'knex';

const TEMPLATE_DB = 'rocketadmin_test_template';
const TEMPLATE_LOCK_ID = 4242424242;

const workerId = process.pid;
const pgLiteFolderPath = process.env.PGLITE_FOLDER_PATH;

if (pgLiteFolderPath && pgLiteFolderPath.length > 0) {
	process.env.PGLITE_FOLDER_PATH = path.join(pgLiteFolderPath, `worker-${workerId}`);
} else if (process.env.DATABASE_URL) {
	const url = new URL(process.env.DATABASE_URL);
	const sourceDb = url.pathname.replace(/^\//, '') || 'postgres';
	const workerDbName = `rocketadmin_test_w${workerId}`;
	const baseConnection = {
		host: url.hostname,
		port: Number.parseInt(url.port, 10) || 5432,
		user: decodeURIComponent(url.username),
		password: decodeURIComponent(url.password),
	};

	const admin = knex({
		client: 'pg',
		connection: { ...baseConnection, database: 'template1' },
	});

	try {
		await admin.raw('SELECT pg_advisory_lock(?)', [TEMPLATE_LOCK_ID]);
		try {
			const existing = await admin.raw('SELECT 1 FROM pg_database WHERE datname = ?', [TEMPLATE_DB]);
			if (existing.rows.length === 0) {
				await admin.raw(`CREATE DATABASE "${TEMPLATE_DB}" TEMPLATE "${sourceDb}"`);
				const templateConn = knex({
					client: 'pg',
					connection: { ...baseConnection, database: TEMPLATE_DB },
				});
				try {
					await templateConn.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
				} finally {
					await templateConn.destroy();
				}
				await admin.raw('UPDATE pg_database SET datistemplate = TRUE WHERE datname = ?', [TEMPLATE_DB]);
			}
		} finally {
			await admin.raw('SELECT pg_advisory_unlock(?)', [TEMPLATE_LOCK_ID]);
		}

		try {
			await admin.raw(`DROP DATABASE IF EXISTS "${workerDbName}" WITH (FORCE)`);
		} catch {
			await admin.raw(`DROP DATABASE IF EXISTS "${workerDbName}"`);
		}
		await admin.raw(`CREATE DATABASE "${workerDbName}" TEMPLATE "${TEMPLATE_DB}"`);
	} finally {
		await admin.destroy();
	}

	url.pathname = `/${workerDbName}`;
	process.env.DATABASE_URL = url.toString();
}
