// Port of validators/connection-string.validator.ts: parses a pasted connection string into the
// connect-db form fields, and validates the "Connection string" input.
import { ConnectionStringParser } from 'connection-string-parser';
import { DBtype } from '@/models/connection';
import { toRule, type ValidationErrors, type ValidationRule } from './types';

export interface ParsedConnectionString {
	dbType: DBtype;
	host: string;
	port: string;
	username: string;
	password: string;
	database: string;
	authSource?: string;
	schema?: string;
	ssl?: boolean;
}

const schemeToDbType: Record<string, DBtype> = {
	mysql: DBtype.MySQL,
	mariadb: DBtype.MySQL,
	postgres: DBtype.Postgres,
	postgresql: DBtype.Postgres,
	mongodb: DBtype.Mongo,
	'mongodb+srv': DBtype.Mongo,
	mssql: DBtype.MSSQL,
	sqlserver: DBtype.MSSQL,
	oracle: DBtype.Oracle,
	oracledb: DBtype.Oracle,
	cassandra: DBtype.Cassandra,
	redis: DBtype.Redis,
	rediss: DBtype.Redis,
	elasticsearch: DBtype.Elasticsearch,
	clickhouse: DBtype.ClickHouse,
};

const defaultPorts: Record<DBtype, string> = {
	[DBtype.MySQL]: '3306',
	[DBtype.Postgres]: '5432',
	[DBtype.Oracle]: '1521',
	[DBtype.MSSQL]: '1433',
	[DBtype.Mongo]: '27017',
	[DBtype.Dynamo]: '',
	[DBtype.Cassandra]: '9042',
	[DBtype.Redis]: '6379',
	[DBtype.Elasticsearch]: '9200',
	[DBtype.ClickHouse]: '8443',
};

/** Throws `Error('invalidFormat')` or `Error('unsupportedScheme')`, or whatever the parser throws. */
export function parseConnectionString(connectionString: string): ParsedConnectionString {
	const schemeMatch = connectionString.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
	if (!schemeMatch?.[1]) {
		throw new Error('invalidFormat');
	}

	const scheme = schemeMatch[1].toLowerCase();
	const dbType = schemeToDbType[scheme];
	if (!dbType) {
		throw new Error('unsupportedScheme');
	}

	const parser = new ConnectionStringParser({ scheme, hosts: [] });
	const parsed = parser.parse(connectionString);

	const result: ParsedConnectionString = {
		dbType,
		host: '',
		port: defaultPorts[dbType],
		username: '',
		password: '',
		database: '',
	};

	const firstHost = parsed.hosts?.[0];
	if (firstHost) {
		result.host = firstHost.host || '';
		if (firstHost.port) {
			result.port = String(firstHost.port);
		}
	}

	if (parsed.username) {
		result.username = decodeURIComponent(parsed.username);
	}

	if (parsed.password) {
		result.password = decodeURIComponent(parsed.password);
	}

	if (parsed.endpoint) {
		result.database = parsed.endpoint;
	}

	if (parsed.options) {
		if (parsed.options.authSource) {
			result.authSource = parsed.options.authSource;
		}
		if (parsed.options.schema) {
			result.schema = parsed.options.schema;
		}
		if (
			parsed.options.ssl === 'true' ||
			parsed.options.sslmode === 'require' ||
			parsed.options.sslmode === 'verify-full'
		) {
			result.ssl = true;
		}
	}

	return result;
}

/**
 * `{ invalidConnectionStringFormat: true }`, `{ unsupportedScheme: '<scheme>' }` or
 * `{ invalidConnectionString: true }`; `null` for an empty or parseable value.
 */
export function connectionStringErrors(value: unknown): ValidationErrors | null {
	const text = typeof value === 'string' ? value : '';
	if (!text || !text.trim()) return null;

	try {
		parseConnectionString(text);
		return null;
	} catch (e) {
		const message = e instanceof Error ? e.message : '';
		if (message === 'invalidFormat') {
			return { invalidConnectionStringFormat: true };
		}
		if (message === 'unsupportedScheme') {
			const schemeMatch = text.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
			return { unsupportedScheme: schemeMatch?.[1] || true };
		}
		return { invalidConnectionString: true };
	}
}

/** The connect-db page's messages for each error key. */
export function connectionStringErrorMessage(errors: ValidationErrors): string {
	if (errors.invalidConnectionStringFormat)
		return 'Invalid format. Expected: scheme://user:password@host:port/database';
	if (errors.unsupportedScheme) return `Unsupported scheme "${errors.unsupportedScheme}"`;
	return 'Failed to parse connection string';
}

export function connectionStringValidation(): ValidationRule {
	return toRule(connectionStringErrors, connectionStringErrorMessage);
}
