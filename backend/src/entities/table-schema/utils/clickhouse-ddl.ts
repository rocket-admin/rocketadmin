import { createClient } from '@clickhouse/client';
import { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config.js';

export interface ClickHouseExecutionConnection {
	host?: string | null;
	port?: number | null;
	username?: string | null;
	password?: string | null;
	database?: string | null;
	ssl?: boolean | null;
	cert?: string | null;
}

export async function executeClickHouseDdl(connection: ClickHouseExecutionConnection, sql: string): Promise<void> {
	const host = connection.host ?? '';
	const port = connection.port ?? 8123;
	const protocol = connection.ssl ? 'https' : 'http';

	const clientConfig: NodeClickHouseClientConfigOptions = {
		url: `${protocol}://${host}:${port}`,
		username: connection.username ?? 'default',
		password: connection.password ?? '',
		database: connection.database ?? 'default',
	};

	if (connection.ssl && connection.cert) {
		clientConfig.tls = { ca_cert: Buffer.from(connection.cert) };
	}

	const client = createClient(clientConfig);
	try {
		await client.command({ query: sql });
	} finally {
		await client.close();
	}
}
