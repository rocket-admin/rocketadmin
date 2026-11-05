import { DataAccessObjectPostgres } from '@rocketadmin/shared-code/dist/src/data-access-layer/data-access-objects/data-access-object-postgres.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import test from 'ava';
import { Knex } from 'knex';

// The Postgres DAO describes user-defined column types (enums, composite types) from the catalog
// while reading a table's structure. It used to run two catalog queries per USER-DEFINED column,
// sequentially and without deduplicating repeated types — the "N+1 query with repeating spans"
// Sentry reported on the pg_type/pg_class/pg_attribute SELECT. The structure must now be built
// from one composite-attributes query and one enum-labels query for the whole table.

type RecordedQuery = {
	from: string;
	whereIn: Array<{ column: string; values: Array<string> }>;
};

type RowResolver = (query: RecordedQuery) => Array<Record<string, unknown>>;

function createFakeKnex(resolveRows: RowResolver): { knex: Knex; queries: Array<RecordedQuery> } {
	const queries: Array<RecordedQuery> = [];
	const createBuilder = (from: string) => {
		const query: RecordedQuery = { from, whereIn: [] };
		queries.push(query);
		const chain: any = {
			select: () => chain,
			from: (table: string) => {
				query.from = table;
				return chain;
			},
			join: () => chain,
			where: () => chain,
			andWhere: () => chain,
			whereIn: (column: string, values: Array<string>) => {
				query.whereIn.push({ column, values });
				return chain;
			},
			orderBy: () => chain,
			// biome-ignore lint/suspicious/noThenProperty: knex query builders are thenables, the DAO awaits them
			then: (onFulfilled: (rows: unknown) => unknown, onRejected: (error: unknown) => unknown) =>
				Promise.resolve()
					.then(() => resolveRows(query))
					.then(onFulfilled, onRejected),
		};
		return chain;
	};
	const knex: any = (table: string) => createBuilder(table);
	knex.select = () => createBuilder('');
	knex.raw = (sql: string) => ({ sql });
	return { knex: knex as Knex, queries };
}

class StubbedPostgresDao extends DataAccessObjectPostgres {
	private readonly fakeKnex: Knex;

	constructor(fakeKnex: Knex) {
		super({ type: ConnectionTypesEnum.postgres, host: 'localhost', database: 'db' } as any);
		this.fakeKnex = fakeKnex;
	}

	protected override async configureKnex(): Promise<Knex<any, any[]>> {
		return this.fakeKnex;
	}
}

function columnRow(
	column_name: string,
	data_type: string,
	udt_name: string,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		column_name,
		column_default: null,
		data_type,
		udt_schema: 'public',
		udt_name,
		is_nullable: 'YES',
		character_maximum_length: null,
		is_identity: 'NO',
		identity_generation: null,
		...overrides,
	};
}

const TABLE_COLUMNS: Array<Record<string, unknown>> = [
	columnRow('id', 'integer', 'int4', { is_nullable: 'NO', identity_generation: 'BY DEFAULT' }),
	columnRow('mood', 'USER-DEFINED', 'mood_t'),
	columnRow('previous_mood', 'USER-DEFINED', 'mood_t'),
	columnRow('home', 'USER-DEFINED', 'address_t'),
	columnRow('location', 'USER-DEFINED', 'geometry'),
	columnRow('note', 'text', 'text'),
];

const COMPOSITE_ATTRIBUTES: Array<Record<string, unknown>> = [
	{ type_schema: 'public', type_name: 'address_t', attname: 'street', format_type: 'text' },
	{ type_schema: 'public', type_name: 'address_t', attname: 'zip', format_type: 'character varying(10)' },
];

const ENUM_LABELS: Array<Record<string, unknown>> = [
	{ type_schema: 'public', type_name: 'mood_t', enumlabel: 'happy' },
	{ type_schema: 'public', type_name: 'mood_t', enumlabel: 'sad' },
	{ type_schema: 'public', type_name: 'mood_t', enumlabel: 'neutral' },
];

function catalogResolver(
	columns: Array<Record<string, unknown>>,
	attributes: Array<Record<string, unknown>>,
	enumLabels: Array<Record<string, unknown>>,
): RowResolver {
	return (query) => {
		switch (query.from) {
			case 'information_schema.columns':
				return columns;
			case 'pg_type':
				return attributes;
			case 'pg_enum':
				return enumLabels;
			default:
				throw new Error(`unexpected query source ${query.from}`);
		}
	};
}

test('describes every user-defined column with exactly one attributes query and one enum query', async (t) => {
	const { knex, queries } = createFakeKnex(catalogResolver(TABLE_COLUMNS, COMPOSITE_ATTRIBUTES, ENUM_LABELS));
	const dao = new StubbedPostgresDao(knex);

	const structure = await dao.getTableStructureWithoutCache('people');

	const catalogQueries = queries.filter((query) => query.from !== 'information_schema.columns');
	t.deepEqual(
		catalogQueries.map((query) => query.from),
		['pg_type', 'pg_enum'],
		'four custom columns (three distinct types) must cost two catalog queries in total',
	);
	for (const query of catalogQueries) {
		t.is(query.whereIn.length, 1);
		t.is(query.whereIn[0].column, 'pg_type.typname');
		t.deepEqual(query.whereIn[0].values, ['mood_t', 'address_t', 'geometry'], 'repeated types are looked up once');
	}

	const byName = new Map(structure.map((column) => [column.column_name, column]));
	t.is(byName.get('mood').data_type, 'enum');
	t.deepEqual(byName.get('mood').data_type_params, ['happy', 'sad', 'neutral'] as any);
	t.is(byName.get('previous_mood').data_type, 'enum');
	t.deepEqual(byName.get('previous_mood').data_type_params, ['happy', 'sad', 'neutral'] as any);

	t.is(byName.get('home').data_type, 'address_t');
	t.deepEqual(byName.get('home').data_type_params, [
		{ column_name: 'street', data_type: 'text' },
		{ column_name: 'zip', data_type: 'character varying(10)' },
	] as any);

	// An extension base type (PostGIS geometry) is neither an enum nor a composite type: untouched.
	t.is(byName.get('location').data_type, 'USER-DEFINED');
	t.is(byName.get('location').udt_name, 'geometry');
	t.is(byName.get('location').data_type_params, undefined);

	// The rest of the shape is unchanged by the batching.
	t.is(byName.get('id').allow_null, false);
	t.is(byName.get('id').extra, 'auto_increment');
	t.is(byName.get('note').allow_null, true);
	t.is(byName.get('note').extra, undefined);
	for (const column of structure) {
		t.false('is_nullable' in column);
		t.false('udt_schema' in column);
	}
});

test('a table without user-defined columns issues no catalog queries', async (t) => {
	const { knex, queries } = createFakeKnex(
		catalogResolver([columnRow('id', 'integer', 'int4'), columnRow('note', 'text', 'text')], [], []),
	);
	const dao = new StubbedPostgresDao(knex);

	const structure = await dao.getTableStructureWithoutCache('notes');

	t.deepEqual(
		queries.map((query) => query.from),
		['information_schema.columns'],
	);
	t.is(structure.length, 2);
});

test('a same-named type in another schema does not leak its labels or attributes', async (t) => {
	const columns = [
		columnRow('status', 'USER-DEFINED', 'status_t', { udt_schema: 'billing' }),
		columnRow('shape', 'USER-DEFINED', 'shape_t', { udt_schema: 'billing' }),
	];
	const attributes = [
		{ type_schema: 'public', type_name: 'shape_t', attname: 'sides', format_type: 'integer' },
		{ type_schema: 'billing', type_name: 'shape_t', attname: 'kind', format_type: 'text' },
	];
	const enumLabels = [
		{ type_schema: 'public', type_name: 'status_t', enumlabel: 'public_only' },
		{ type_schema: 'billing', type_name: 'status_t', enumlabel: 'open' },
		{ type_schema: 'billing', type_name: 'status_t', enumlabel: 'closed' },
	];
	const { knex } = createFakeKnex(catalogResolver(columns, attributes, enumLabels));
	const dao = new StubbedPostgresDao(knex);

	const structure = await dao.getTableStructureWithoutCache('invoices');

	const byName = new Map(structure.map((column) => [column.column_name, column]));
	t.is(byName.get('status').data_type, 'enum');
	t.deepEqual(byName.get('status').data_type_params, ['open', 'closed'] as any);
	t.is(byName.get('shape').data_type, 'shape_t');
	t.deepEqual(byName.get('shape').data_type_params, [{ column_name: 'kind', data_type: 'text' }] as any);
});
