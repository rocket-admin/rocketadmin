import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ConnectionStringParser } from 'connection-string-parser';
import { DBtype } from '../models/connection';

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
	ibmdb2: DBtype.DB2,
	db2: DBtype.DB2,
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
	[DBtype.DB2]: '50000',
};

export function parseConnectionString(connectionString: string): ParsedConnectionString {
	const schemeMatch = connectionString.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
	if (!schemeMatch) {
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

	if (parsed.hosts?.length > 0) {
		result.host = parsed.hosts[0].host || '';
		if (parsed.hosts[0].port) {
			result.port = String(parsed.hosts[0].port);
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
		if (parsed.options.ssl === 'true' || parsed.options.sslmode === 'require' || parsed.options.sslmode === 'verify-full') {
			result.ssl = true;
		}
	}

	return result;
}

export function connectionStringValidation(): ValidatorFn {
	return (control: AbstractControl): ValidationErrors | null => {
		const value = control.value as string;
		if (!value || !value.trim()) {
			return null;
		}

		try {
			parseConnectionString(value);
			return null;
		} catch (e) {
			if (e.message === 'invalidFormat') {
				return { invalidConnectionStringFormat: true };
			}
			if (e.message === 'unsupportedScheme') {
				const schemeMatch = value.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
				return { unsupportedScheme: schemeMatch?.[1] || true };
			}
			return { invalidConnectionString: true };
		}
	};
}
