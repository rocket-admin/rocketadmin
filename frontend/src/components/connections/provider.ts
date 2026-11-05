// Shared bits of the connect-db page and its dialogs: default ports, the hosting provider guessed
// from the hostname, and the provider names / docs links the dialogs show.
import ipaddr from 'ipaddr.js';
import isIP from 'validator/es/lib/isIP';
import googleIPs from '@/consts/google-IP-addresses';
import { type Connection, DBtype } from '@/models/connection';

/** The address Rocketadmin's servers connect from. */
export const ROCKETADMIN_IP = '18.221.81.73';

export const DEFAULT_PORTS: Record<DBtype, string> = {
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

export type DbProvider =
	| 'amazon'
	| 'amazonDynamoDB'
	| 'azure'
	| 'google'
	| 'mongoatlas'
	| 'digitalocean'
	| 'scylladbcloud'
	| 'supabase';

export const PROVIDER_NAMES: Record<DbProvider, string> = {
	amazon: 'Amazon Web Services',
	azure: 'Microsoft Azure',
	google: 'Google Cloud Platform',
	mongoatlas: 'MongoDB Atlas',
	digitalocean: 'DigitalOcean',
	scylladbcloud: 'ScyllaDB Cloud',
	amazonDynamoDB: 'Amazon DynamoDB',
	supabase: 'Supabase',
};

const DOCS = 'https://docs.rocketadmin.com/Create%20connections/Direct%20connection';

/** The connection-error dialog's "Need help with … integration?" links. */
export const PROVIDER_DOCS_LINKS: Record<DbProvider, string> = {
	amazon: `${DOCS}/create_aws_mysql`,
	azure: 'https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-manage-firewall-portal',
	google: `${DOCS}/create_google_cloud`,
	mongoatlas: `${DOCS}/create_mongo_atlas`,
	digitalocean: `${DOCS}/create_digitalocean_postgresql`,
	scylladbcloud: `${DOCS}/create_scylladb`,
	amazonDynamoDB: `${DOCS}/create_aws_dynamodb`,
	supabase: `${DOCS}/create_supabase`,
};

/** The IP-access dialog's "Setup guide" links (fewer providers than the error dialog). */
export const IP_ACCESS_DOCS_LINKS: Partial<Record<DbProvider, string>> = {
	amazon: PROVIDER_DOCS_LINKS.amazon,
	azure: PROVIDER_DOCS_LINKS.azure,
	google: PROVIDER_DOCS_LINKS.google,
	mongoatlas: PROVIDER_DOCS_LINKS.mongoatlas,
	digitalocean: PROVIDER_DOCS_LINKS.digitalocean,
	supabase: PROVIDER_DOCS_LINKS.supabase,
};

/**
 * The hosting provider, guessed from the hostname; `null` when none matches.
 *
 * Kept as in Angular: a host inside one of Google Cloud's ranges returns `undefined` (the loop's bare
 * `return`) rather than 'google', so neither dialog shows Google-specific help.
 */
export function getProvider(db: Pick<Connection, 'host' | 'type'>): DbProvider | null | undefined {
	const host = db.host ?? '';
	let provider: DbProvider | null = null;
	if (host.endsWith('.amazonaws.com')) provider = 'amazon';
	if (host.endsWith('.amazonaws.com') && db.type === DBtype.Dynamo) provider = 'amazonDynamoDB';
	if (host.endsWith('.azure.com')) provider = 'azure';
	if (host.endsWith('.mongodb.net')) provider = 'mongoatlas';
	if (host.endsWith('.ondigitalocean.com')) provider = 'digitalocean';
	if (host.endsWith('.scylla.cloud')) provider = 'scylladbcloud';
	if (host.endsWith('.supabase.com')) provider = 'supabase';
	// The Google ranges are all IPv4 (Angular threw on an IPv6 host here).
	if (isIP(host) && ipaddr.IPv4.isValid(host)) {
		const hostIP = ipaddr.IPv4.parse(host);
		for (const range of googleIPs) {
			if (hostIP.match(ipaddr.IPv4.parseCIDR(range))) return undefined;
		}
	}
	return provider;
}
