import test from 'ava';
import { emitSettingsMessages } from '../../../src/entities/shared-jobs/utils/emit-settings-messages.util.js';
import { TableSettingsEntity } from '../../../src/entities/table-settings/common-table-settings/table-settings.entity.js';
import { QueryOrderingEnum } from '../../../src/enums/query-ordering.enum.js';

function buildSetting(overrides: Partial<TableSettingsEntity> = {}): TableSettingsEntity {
	const setting = new TableSettingsEntity();
	setting.table_name = 'users';
	return Object.assign(setting, overrides);
}

function collect(setting: TableSettingsEntity): Array<string> {
	const lines: Array<string> = [];
	emitSettingsMessages(setting, (text) => lines.push(text));
	return lines;
}

test('emits one line per populated parameter', (t) => {
	const setting = buildSetting({
		display_name: 'Users',
		search_fields: ['name', 'email'],
		readonly_fields: ['id', 'created_at'],
		columns_view: ['id', 'name', 'email'],
		ordering: QueryOrderingEnum.DESC,
		ordering_field: 'created_at',
		identity_column: 'email',
	});

	const lines = collect(setting);

	t.deepEqual(lines, [
		'Set up settings for table "users", display_name parameter set to "Users"',
		'Set up settings for table "users", search_fields parameter set to name, email',
		'Set up settings for table "users", readonly_fields parameter set to id, created_at',
		'Set up settings for table "users", columns_view parameter set to id, name, email',
		'Set up settings for table "users", ordering parameter set to DESC',
		'Set up settings for table "users", ordering_field parameter set to "created_at"',
		'Set up settings for table "users", identity_column parameter set to "email"',
	]);
});

test('skips parameters that are null, undefined, or empty arrays', (t) => {
	const setting = buildSetting({
		display_name: 'Users',
		search_fields: [],
		readonly_fields: null,
		columns_view: undefined,
		ordering: null,
		ordering_field: null,
		identity_column: null,
	});

	const lines = collect(setting);

	t.deepEqual(lines, ['Set up settings for table "users", display_name parameter set to "Users"']);
});

test('emits default-parameters fallback when nothing is populated', (t) => {
	const setting = buildSetting({
		table_name: 'orders',
	});

	const lines = collect(setting);

	t.deepEqual(lines, ['Set up settings for table "orders" with default parameters']);
});

test('uses the table name from the setting in every line', (t) => {
	const setting = buildSetting({
		table_name: 'products',
		display_name: 'Products',
		ordering: QueryOrderingEnum.ASC,
	});

	const lines = collect(setting);

	t.true(lines.every((line) => line.includes('"products"')));
	t.is(lines.length, 2);
});

test('joins array-valued parameters with comma+space', (t) => {
	const setting = buildSetting({
		search_fields: ['first_name', 'last_name', 'email'],
	});

	const lines = collect(setting);

	t.is(lines.length, 1);
	t.is(lines[0], 'Set up settings for table "users", search_fields parameter set to first_name, last_name, email');
});
