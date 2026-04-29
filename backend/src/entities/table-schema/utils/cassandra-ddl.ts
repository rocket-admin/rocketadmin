import * as cassandra from 'cassandra-driver';

export interface CassandraExecutionConnection {
	host?: string | null;
	port?: number | null;
	username?: string | null;
	password?: string | null;
	database?: string | null;
	dataCenter?: string | null;
	ssl?: boolean | null;
	cert?: string | null;
}

export async function executeCassandraDdl(connection: CassandraExecutionConnection, cql: string): Promise<void> {
	const host = connection.host ?? '';
	const port = connection.port ?? 9042;
	const authProvider = new cassandra.auth.PlainTextAuthProvider(
		connection.username ?? 'cassandra',
		connection.password ?? 'cassandra',
	);

	const clientOptions: cassandra.ClientOptions = {
		contactPoints: [host],
		localDataCenter: connection.dataCenter || undefined,
		keyspace: connection.database ?? undefined,
		authProvider,
		protocolOptions: { port },
		queryOptions: {
			consistency: cassandra.types.consistencies.localQuorum,
		},
	};

	if (connection.ssl) {
		clientOptions.sslOptions = { rejectUnauthorized: false };
		if (connection.cert) {
			clientOptions.sslOptions.ca = [connection.cert];
		}
	}

	const client = new cassandra.Client(clientOptions);
	try {
		await client.connect();
		await client.execute(cql);
	} finally {
		await client.shutdown().catch(() => undefined);
	}
}
