import { describe, expect, it } from 'vitest';
import { DBtype } from '@/models/connection';
import { getProvider } from './provider';

describe('getProvider', () => {
	it.each([
		['db.cvfuxe8nltiq.us-east-2.rds.amazonaws.com', DBtype.MySQL, 'amazon'],
		['dynamodb.us-east-2.amazonaws.com', DBtype.Dynamo, 'amazonDynamoDB'],
		['server.postgres.database.azure.com', DBtype.Postgres, 'azure'],
		['cluster0.abcde.mongodb.net', DBtype.Mongo, 'mongoatlas'],
		['db-postgresql-fra1.b.db.ondigitalocean.com', DBtype.Postgres, 'digitalocean'],
		['node-0.aws-us-east-1.scylla.cloud', DBtype.Cassandra, 'scylladbcloud'],
		['aws-0-eu-central-1.pooler.supabase.com', DBtype.Postgres, 'supabase'],
		['db.example.com', DBtype.MySQL, null],
		['18.221.81.73', DBtype.MySQL, null],
	])('%s (%s) -> %s', (host, type, provider) => {
		expect(getProvider({ host, type })).toBe(provider);
	});

	it('returns undefined for a Google Cloud IP, as Angular did', () => {
		expect(getProvider({ host: '34.80.0.1', type: DBtype.MySQL })).toBeUndefined();
	});

	it('copes with an IPv6 host', () => {
		expect(getProvider({ host: '2001:db8::1', type: DBtype.MySQL })).toBeNull();
	});
});
