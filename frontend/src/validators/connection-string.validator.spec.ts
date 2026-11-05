import { describe, expect, it } from 'vitest';
import { DBtype } from '@/models/connection';
import {
	connectionStringErrors,
	connectionStringValidation,
	parseConnectionString,
} from './connection-string.validator';

describe('connection string validator', () => {
	describe('parseConnectionString', () => {
		it('parses a full postgres URL', () => {
			expect(
				parseConnectionString('postgresql://admin:p%40ss@db.example.com:6543/shop?sslmode=require&schema=app'),
			).toEqual({
				dbType: DBtype.Postgres,
				host: 'db.example.com',
				port: '6543',
				username: 'admin',
				password: 'p@ss',
				database: 'shop',
				schema: 'app',
				ssl: true,
			});
		});

		it('falls back to the default port of the database type', () => {
			expect(parseConnectionString('mysql://root@localhost/app')).toMatchObject({
				dbType: DBtype.MySQL,
				host: 'localhost',
				port: '3306',
				username: 'root',
				password: '',
			});
			expect(parseConnectionString('mongodb+srv://u:p@cluster0.mongodb.net/db?authSource=admin')).toMatchObject({
				dbType: DBtype.Mongo,
				port: '27017',
				authSource: 'admin',
			});
		});

		it('throws invalidFormat and unsupportedScheme', () => {
			expect(() => parseConnectionString('db.example.com:5432')).toThrow('invalidFormat');
			expect(() => parseConnectionString('ftp://host')).toThrow('unsupportedScheme');
		});
	});

	describe('connectionStringErrors', () => {
		it('passes empty and valid values', () => {
			expect(connectionStringErrors('')).toBeNull();
			expect(connectionStringErrors('   ')).toBeNull();
			expect(connectionStringErrors('redis://:secret@cache.example.com:6380')).toBeNull();
		});

		it('reports the error keys the connect-db page reads', () => {
			expect(connectionStringErrors('just text')).toEqual({ invalidConnectionStringFormat: true });
			expect(connectionStringErrors('ftp://host')).toEqual({ unsupportedScheme: 'ftp' });
		});

		it('works as a rule with the page messages', () => {
			const rule = connectionStringValidation();
			expect(rule('mysql://root@db.example.com/app')).toBe(true);
			expect(rule('just text')).toBe('Invalid format. Expected: scheme://user:password@host:port/database');
			expect(rule('ftp://host')).toBe('Unsupported scheme "ftp"');
		});
	});
});
