import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import test from 'ava';
import { applyProposedDdl } from '../../src/entities/connection/utils/apply-proposed-ddl.util.js';
import {
	buildMermaidErDiagram,
	MermaidTableInput,
} from '../../src/entities/connection/utils/build-mermaid-er-diagram.util.js';

function baseUsersTable(): MermaidTableInput {
	return {
		tableName: 'users',
		structure: [
			{
				column_name: 'id',
				data_type: 'integer',
				data_type_params: '',
				udt_name: 'int4',
				allow_null: false,
				character_maximum_length: null,
				column_default: null,
			},
			{
				column_name: 'email',
				data_type: 'varchar',
				data_type_params: '',
				udt_name: 'varchar',
				allow_null: false,
				character_maximum_length: 255,
				column_default: null,
			},
		],
		primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
		foreignKeys: [],
	};
}

test('applyProposedDdl: applies ADD COLUMN and tracks it in addedColumns', (t) => {
	const tables = [baseUsersTable()];
	const { mutatedTables, diff } = applyProposedDdl(
		tables,
		['ALTER TABLE users ADD COLUMN age INTEGER NOT NULL DEFAULT 0'],
		ConnectionTypesEnum.postgres,
	);
	t.is(mutatedTables.length, 1);
	const users = mutatedTables[0];
	t.true(users.structure.some((c) => c.column_name === 'age'));
	t.deepEqual([...(diff.addedColumns.get('users') ?? new Set())], ['age']);
	t.is(diff.statementResults.length, 1);
	t.is(diff.statementResults[0].status, 'applied');
});

test('applyProposedDdl: CREATE TABLE with inline REFERENCES produces table + FK in diff', (t) => {
	const tables = [baseUsersTable()];
	const { mutatedTables, diff } = applyProposedDdl(
		tables,
		['CREATE TABLE posts (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), body TEXT)'],
		ConnectionTypesEnum.postgres,
	);
	t.is(mutatedTables.length, 2);
	const posts = mutatedTables.find((tt) => tt.tableName === 'posts')!;
	t.truthy(posts);
	t.is(posts.foreignKeys.length, 1);
	t.is(posts.foreignKeys[0].referenced_table_name, 'users');
	t.is(posts.foreignKeys[0].column_name, 'user_id');
	t.deepEqual([...diff.addedTables], ['posts']);
	t.deepEqual([...(diff.addedForeignKeys.get('posts') ?? new Set())], ['user_id->users.id']);
});

test('applyProposedDdl: DROP COLUMN removes column and lists it in droppedColumns', (t) => {
	const tables = [baseUsersTable()];
	const { mutatedTables, diff } = applyProposedDdl(
		tables,
		['ALTER TABLE users DROP COLUMN email'],
		ConnectionTypesEnum.postgres,
	);
	t.is(mutatedTables[0].structure.length, 1);
	t.false(mutatedTables[0].structure.some((c) => c.column_name === 'email'));
	t.deepEqual([...(diff.droppedColumns.get('users') ?? new Set())], ['email']);
});

test('applyProposedDdl: DROP TABLE removes the table and lists it in droppedTables', (t) => {
	const tables = [baseUsersTable(), { ...baseUsersTable(), tableName: 'sessions' }];
	const { mutatedTables, diff } = applyProposedDdl(tables, ['DROP TABLE sessions'], ConnectionTypesEnum.postgres);
	t.is(mutatedTables.length, 1);
	t.is(mutatedTables[0].tableName, 'users');
	t.deepEqual([...diff.droppedTables], ['sessions']);
});

test('applyProposedDdl: ALTER TABLE ADD FOREIGN KEY constraint produces FK in diff', (t) => {
	const tables = [
		baseUsersTable(),
		{
			tableName: 'posts',
			structure: [
				{
					column_name: 'id',
					data_type: 'integer',
					data_type_params: '',
					udt_name: 'int4',
					allow_null: false,
					character_maximum_length: null,
					column_default: null,
				},
				{
					column_name: 'user_id',
					data_type: 'integer',
					data_type_params: '',
					udt_name: 'int4',
					allow_null: true,
					character_maximum_length: null,
					column_default: null,
				},
			],
			primaryColumns: [{ column_name: 'id', data_type: 'integer' }],
			foreignKeys: [],
		},
	];
	const { mutatedTables, diff } = applyProposedDdl(
		tables,
		['ALTER TABLE posts ADD CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id)'],
		ConnectionTypesEnum.postgres,
	);
	const posts = mutatedTables.find((tt) => tt.tableName === 'posts')!;
	t.is(posts.foreignKeys.length, 1);
	t.is(posts.foreignKeys[0].column_name, 'user_id');
	t.is(posts.foreignKeys[0].referenced_table_name, 'users');
	t.deepEqual([...(diff.addedForeignKeys.get('posts') ?? new Set())], ['user_id->users.id']);
});

test('applyProposedDdl: parse errors are reported per-statement and do not abort the batch', (t) => {
	const tables = [baseUsersTable()];
	const { diff } = applyProposedDdl(
		tables,
		['ALTER TABLE users ADD COLUMN good_col INTEGER', 'THIS IS NOT VALID SQL'],
		ConnectionTypesEnum.postgres,
	);
	t.is(diff.statementResults.length, 2);
	t.is(diff.statementResults[0].status, 'applied');
	t.is(diff.statementResults[1].status, 'error');
	t.regex(String(diff.statementResults[1].message), /parse error/);
});

test('applyProposedDdl: empty statements are skipped, not errored', (t) => {
	const tables = [baseUsersTable()];
	const { diff } = applyProposedDdl(tables, ['', '   '], ConnectionTypesEnum.postgres);
	t.is(diff.statementResults.length, 2);
	t.true(diff.statementResults.every((r) => r.status === 'skipped'));
});

test('applyProposedDdl: ALTER on unknown table is skipped with reason', (t) => {
	const tables = [baseUsersTable()];
	const { diff } = applyProposedDdl(
		tables,
		['ALTER TABLE nonexistent ADD COLUMN x INTEGER'],
		ConnectionTypesEnum.postgres,
	);
	t.is(diff.statementResults[0].status, 'skipped');
	t.regex(String(diff.statementResults[0].message), /does not exist/);
});

test('buildMermaidErDiagram: highlight adds classDef and class lines for added tables', (t) => {
	const tables: MermaidTableInput[] = [
		baseUsersTable(),
		{
			tableName: 'posts',
			structure: [
				{
					column_name: 'id',
					data_type: 'serial',
					data_type_params: '',
					udt_name: 'serial',
					allow_null: false,
					character_maximum_length: null,
					column_default: null,
				},
			],
			primaryColumns: [{ column_name: 'id', data_type: 'serial' }],
			foreignKeys: [],
		},
	];
	const { diagram } = buildMermaidErDiagram('mydb', tables, {
		addedTables: new Set(['posts']),
		addedColumns: new Map([['posts', new Set(['id'])]]),
		addedForeignKeys: new Map(),
	});
	t.true(diagram.includes('classDef addedEntity'));
	t.true(diagram.includes('fill:#d4edda'));
	t.true(diagram.includes('class posts addedEntity'));
	t.false(diagram.includes('class users addedEntity'));
});

test('buildMermaidErDiagram: highlight tags new columns with NEW marker', (t) => {
	const tables: MermaidTableInput[] = [
		{
			...baseUsersTable(),
			structure: [
				...baseUsersTable().structure,
				{
					column_name: 'nickname',
					data_type: 'varchar',
					data_type_params: '',
					udt_name: 'varchar',
					allow_null: true,
					character_maximum_length: 50,
					column_default: null,
				},
			],
		},
	];
	const { diagram } = buildMermaidErDiagram('mydb', tables, {
		addedTables: new Set(),
		addedColumns: new Map([['users', new Set(['nickname'])]]),
		addedForeignKeys: new Map(),
	});
	t.regex(diagram, /varchar nickname[^\n]*\[NEW\]"/);
});

test('buildMermaidErDiagram: highlight tags new FK relationships with [NEW]', (t) => {
	const tables: MermaidTableInput[] = [
		baseUsersTable(),
		{
			tableName: 'posts',
			structure: [
				{
					column_name: 'user_id',
					data_type: 'integer',
					data_type_params: '',
					udt_name: 'int4',
					allow_null: true,
					character_maximum_length: null,
					column_default: null,
				},
			],
			primaryColumns: [],
			foreignKeys: [
				{
					column_name: 'user_id',
					referenced_table_name: 'users',
					referenced_column_name: 'id',
					constraint_name: 'fk_posts_user',
				},
			],
		},
	];
	const { diagram } = buildMermaidErDiagram('mydb', tables, {
		addedTables: new Set(),
		addedColumns: new Map(),
		addedForeignKeys: new Map([['posts', new Set(['user_id->users.id'])]]),
	});
	t.regex(diagram, /posts \}o--\|\| users : "user_id -> id \[NEW\]"/);
});

test('buildMermaidErDiagram: without highlight, behavior matches the legacy non-preview output', (t) => {
	const tables = [baseUsersTable()];
	const { diagram } = buildMermaidErDiagram('mydb', tables);
	t.false(diagram.includes('classDef'));
	t.false(diagram.includes('NEW'));
});
