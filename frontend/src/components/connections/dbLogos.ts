// The database logos Angular registered as mat-icons in AppComponent (served from /assets).
const LOGOS: Record<string, string> = {
	mysql: '/assets/icons/db-logos/mysql_logo.svg',
	mssql: '/assets/icons/db-logos/mssql_logo.svg',
	oracledb: '/assets/icons/db-logos/oracle_logo.svg',
	postgres: '/assets/icons/db-logos/postgres_logo.svg',
	mongodb: '/assets/icons/db-logos/mongodb_logo.svg',
	dynamodb: '/assets/icons/db-logos/dynamodb_logo.svg',
	// The file names start with a Cyrillic "с", as in the Angular assets.
	cassandra: '/assets/icons/db-logos/%D1%81assandra_logo.svg',
	'cassandra-dark': '/assets/icons/db-logos/%D1%81assandra_logo_dark.svg',
	redis: '/assets/icons/db-logos/redis_logo.svg',
	elasticsearch: '/assets/icons/db-logos/elasticsearch_logo.svg',
	clickhouse: '/assets/icons/db-logos/clickhouse_logo.svg',
};

/** Logo URL for a database type; Cassandra has a variant for dark mode. */
export function dbLogo(type: string, darkMode = false): string | undefined {
	return LOGOS[type === 'cassandra' && darkMode ? 'cassandra-dark' : type];
}
