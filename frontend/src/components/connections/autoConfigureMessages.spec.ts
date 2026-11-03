import { describe, expect, it } from 'vitest';
import { countMessage, humanizeMessage } from './autoConfigureMessages';

describe('auto-configure messages', () => {
	it.each([
		['Starting configuration…', 'Starting configuration…'],
		['Starting AI scan for connection', 'Looking at your database…'],
		['Fetching tables from database', 'Reading your tables…'],
		['Found 1 new table to scan', 'Found 1 table to set up'],
		['Found 4 new tables to scan', 'Found 4 tables to set up'],
		['No new tables to scan', 'Everything is already set up'],
		['Inspected structure of table "users"', 'Read structure of users'],
		['Generating settings with AI for 3 tables', 'Choosing the best layout for 3 tables…'],
		['AI returned settings for 1 table', 'Recommendations ready for 1 table'],
		['Validation failed for table "orders"', "Couldn't configure orders, skipped it"],
		['Set up settings for table "users", display_name parameter set to "Users"', 'Renamed users → Users'],
		['Set up settings for table "users", search_fields parameter set to email, name', 'Search by email, name in users'],
		['Set up settings for table "users", ordering parameter set to DESC', 'users sorted descending by default'],
		[
			'Set up settings for table "users", ordering_field parameter set to "created_at"',
			'users sorts by created_at by default',
		],
		['Set up settings for table "users" with default parameters', 'users is ready with default setup'],
		['Added Phone widget for table "users" on column "phone"', 'users.phone formatted as phone numbers'],
		['Added Foo widget for table "users" on column "x"', 'Foo widget enabled for users.x'],
		['Set up settings for table "users", list_per_page parameter set to 50', 'users: list per page configured'],
		['Something else', 'Something else'],
	])('%s', (raw, expected) => {
		expect(humanizeMessage(raw)).toBe(expected);
	});

	it('counts widgets, settings and configured tables', () => {
		expect(countMessage('Added Phone widget for table "users" on column "phone"')).toEqual({
			kind: 'widget',
			table: 'users',
		});
		expect(countMessage('Set up settings for table "orders", ordering parameter set to ASC')).toEqual({
			kind: 'setting',
			table: 'orders',
		});
		expect(countMessage('Set up settings for table "logs" with default parameters')).toEqual({
			kind: null,
			table: 'logs',
		});
		expect(countMessage('Reading your tables')).toEqual({ kind: null, table: null });
	});
});
