import { describe, expect, it } from 'vitest';
import { DBtype } from '@/models/connection';
import { hostnameErrors, hostnameValidation } from './hostname.validator';

describe('hostname validator', () => {
	it('passes empty values, public IPs and FQDNs', () => {
		for (const value of ['', null, 'db.example.com', '8.8.8.8', '2001:4860:4860::8888'])
			expect(hostnameErrors(value, DBtype.MySQL)).toBeNull();
	});

	it('flags localhost and private, loopback, link-local and CGNAT addresses', () => {
		for (const value of [
			'localhost',
			'127.0.0.1',
			'10.0.0.5',
			'192.168.1.1',
			'169.254.1.1',
			'100.64.0.1',
			'::1',
			'fd00::1',
		])
			expect(hostnameErrors(value, DBtype.Postgres)).toEqual({ isLocalhost: true });
	});

	it('flags invalid hostnames', () => {
		for (const value of ['not a host', 'db_host', 'https://db.example.com'])
			expect(hostnameErrors(value, DBtype.Postgres)).toEqual({ isInvalidHostname: true });
	});

	it('requires https:// for DynamoDB and validates the rest', () => {
		expect(hostnameErrors('dynamodb.us-east-1.amazonaws.com', DBtype.Dynamo)).toEqual({ missingHttps: true });
		expect(hostnameErrors('https://dynamodb.us-east-1.amazonaws.com', DBtype.Dynamo)).toBeNull();
		expect(hostnameErrors('https://bad host', DBtype.Dynamo)).toEqual({ isInvalidHostname: true });
	});

	it('strips mongodb+srv:// for MongoDB', () => {
		expect(hostnameErrors('mongodb+srv://cluster0.abc.mongodb.net', DBtype.Mongo)).toBeNull();
		expect(hostnameErrors('mongodb+srv://cluster0.abc.mongodb.net', DBtype.MySQL)).toEqual({ isInvalidHostname: true });
	});

	it('works as a rule', () => {
		const rule = hostnameValidation(DBtype.Dynamo);
		expect(rule('https://dynamodb.us-east-1.amazonaws.com')).toBe(true);
		expect(rule('dynamodb.amazonaws.com')).toBe('Hostname must start with "https://"');
		expect(hostnameValidation(DBtype.MySQL)('???')).toBe('Hostname is invalid');
		expect(hostnameValidation(DBtype.MySQL)('localhost')).toContain('internal IP');
	});
});
