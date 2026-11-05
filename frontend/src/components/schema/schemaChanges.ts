// The schema editor's view of an AI-generated change: a display action/icon/tone per change type,
// and the columns of a CREATE TABLE read from its SQL (node-sql-parser, loaded on first use — it
// bundles every dialect's grammar). Ported from the private helpers of EditDatabaseSchemaComponent.
import type { SchemaChangeResponse } from '@/stores/table-schema';

export interface ParsedColumn {
	name: string;
	type: string;
	pk: boolean;
	fk: boolean;
	referenceTable?: string;
	notNull: boolean;
	unique: boolean;
	defaultValue?: string;
}

export type ChangeTone = 'add' | 'edit' | 'remove';

export interface ParsedChange {
	id: string;
	action: string;
	icon: string;
	tone: ChangeTone;
	targetTableName: string;
	aiSummary?: string | null;
	columns: ParsedColumn[];
	forwardSql: string;
}

interface ChangeMeta {
	action: string;
	icon: string;
	tone: ChangeTone;
}

const CHANGE_META: Record<string, ChangeMeta> = {
	CREATE_TABLE: { action: 'Create table', icon: 'add_box', tone: 'add' },
	DROP_TABLE: { action: 'Drop table', icon: 'delete_outline', tone: 'remove' },
	ADD_COLUMN: { action: 'Add column', icon: 'add', tone: 'add' },
	DROP_COLUMN: { action: 'Drop column', icon: 'remove', tone: 'remove' },
	ALTER_COLUMN: { action: 'Modify column', icon: 'edit', tone: 'edit' },
	ADD_INDEX: { action: 'Add index', icon: 'bookmark_add', tone: 'add' },
	DROP_INDEX: { action: 'Drop index', icon: 'bookmark_remove', tone: 'remove' },
	ADD_FOREIGN_KEY: { action: 'Add foreign key', icon: 'link', tone: 'add' },
	DROP_FOREIGN_KEY: { action: 'Drop foreign key', icon: 'link_off', tone: 'remove' },
	ADD_PRIMARY_KEY: { action: 'Add primary key', icon: 'vpn_key', tone: 'add' },
	DROP_PRIMARY_KEY: { action: 'Drop primary key', icon: 'key_off', tone: 'remove' },
	MONGO_CREATE_COLLECTION: { action: 'Create collection', icon: 'add_box', tone: 'add' },
	MONGO_DROP_COLLECTION: { action: 'Drop collection', icon: 'delete_outline', tone: 'remove' },
	MONGO_SET_VALIDATOR: { action: 'Set validator', icon: 'rule', tone: 'edit' },
	MONGO_CREATE_INDEX: { action: 'Create index', icon: 'bookmark_add', tone: 'add' },
	MONGO_DROP_INDEX: { action: 'Drop index', icon: 'bookmark_remove', tone: 'remove' },
	DYNAMODB_CREATE_TABLE: { action: 'Create table', icon: 'add_box', tone: 'add' },
	DYNAMODB_DROP_TABLE: { action: 'Drop table', icon: 'delete_outline', tone: 'remove' },
	DYNAMODB_UPDATE_TABLE: { action: 'Update table', icon: 'edit', tone: 'edit' },
	ELASTICSEARCH_CREATE_INDEX: { action: 'Create index', icon: 'add_box', tone: 'add' },
	ELASTICSEARCH_DELETE_INDEX: { action: 'Delete index', icon: 'delete_outline', tone: 'remove' },
	ELASTICSEARCH_UPDATE_MAPPING: { action: 'Update mapping', icon: 'edit', tone: 'edit' },
	ROLLBACK: { action: 'Rollback', icon: 'undo', tone: 'edit' },
};

/** Known change types get their label; anything else is its type in sentence case with a `code` icon. */
export function changeMeta(changeType: string | null | undefined): ChangeMeta {
	const upper = (changeType ?? '').toUpperCase();
	return (
		CHANGE_META[upper] ?? {
			action: upper
				.replace(/_/g, ' ')
				.toLowerCase()
				.replace(/\b\w/, (c) => c.toUpperCase()),
			icon: 'code',
			tone: 'edit',
		}
	);
}

export async function parseChange(change: SchemaChangeResponse): Promise<ParsedChange> {
	const meta = changeMeta(change.changeType);
	const parsed: ParsedChange = {
		id: change.id,
		action: meta.action,
		icon: meta.icon,
		tone: meta.tone,
		targetTableName: change.targetTableName,
		aiSummary: change.aiSummary,
		columns: [],
		forwardSql: change.forwardSql,
	};
	if ((change.changeType ?? '').toUpperCase() === 'CREATE_TABLE' && change.forwardSql) {
		parsed.columns = await parseCreateTableColumns(change.forwardSql);
	}
	return parsed;
}

/** The columns of every CREATE TABLE in `sql`, tried as PostgreSQL then MySQL; `[]` if neither parses. */
export async function parseCreateTableColumns(sql: string): Promise<ParsedColumn[]> {
	let parser: { astify(sql: string, options: { database: string }): unknown };
	try {
		const { Parser } = await import('node-sql-parser');
		parser = new Parser();
	} catch {
		return [];
	}
	let ast: unknown;
	try {
		ast = parser.astify(sql, { database: 'PostgresQL' });
	} catch {
		try {
			ast = parser.astify(sql, { database: 'MySQL' });
		} catch {
			return [];
		}
	}
	const nodes = Array.isArray(ast) ? ast : [ast];
	const columns: ParsedColumn[] = [];
	const colIndex = new Map<string, number>();
	for (const node of nodes) {
		const root = node as Record<string, unknown> | null;
		if (!root || root.type !== 'create' || root.keyword !== 'table') continue;
		const defs = (root.create_definitions as unknown[]) ?? [];
		for (const rawDef of defs) {
			const def = rawDef as Record<string, unknown>;
			if (def.resource === 'column') {
				const name = extractColumnName(def.column);
				if (!name) continue;
				const dataType = (def.definition as { dataType?: string } | undefined)?.dataType ?? '';
				const primary = def.primary as string | undefined;
				const nullable = (def.nullable as { value?: string } | undefined)?.value;
				const ref = extractReferenceTable(def.reference_definition);
				colIndex.set(name, columns.length);
				columns.push({
					name,
					type: dataType.toLowerCase(),
					pk: primary === 'primary key' || primary === 'key',
					fk: !!ref,
					referenceTable: ref ?? undefined,
					notNull: nullable === 'not null',
					unique: !!def.unique,
					defaultValue: extractDefault(def.default_val),
				});
			} else if (def.resource === 'constraint') {
				const ctype = (def.constraint_type as string | undefined)?.toLowerCase();
				const colRefs = (def.definition as unknown[]) ?? [];
				if (ctype === 'primary key') {
					for (const c of colRefs) {
						const colName = extractColumnName(c);
						if (!colName) continue;
						const column = columns[colIndex.get(colName) ?? -1];
						if (column) column.pk = true;
					}
				} else if (ctype === 'foreign key') {
					const refTable = extractReferenceTable(def.reference_definition);
					for (const c of colRefs) {
						const colName = extractColumnName(c);
						if (!colName) continue;
						const column = columns[colIndex.get(colName) ?? -1];
						if (column) {
							column.fk = true;
							if (refTable) column.referenceTable = refTable;
						}
					}
				}
			}
		}
	}
	return columns;
}

/** Whether a Mermaid ER source declares at least one entity (`name {`). */
export function mermaidHasEntities(source: string): boolean {
	if (!source) return false;
	for (const line of source.split('\n')) {
		if (/^\s*[A-Za-z_][\w-]*\s*\{/.test(line)) return true;
	}
	return false;
}

/** A database error collapsed to one line of at most 120 characters. */
export function summarizeError(err: string | null | undefined): string {
	if (!err) return 'unknown error';
	const compact = err.replace(/\s+/g, ' ').trim();
	return compact.length > 120 ? `${compact.slice(0, 120)}…` : compact;
}

function extractColumnName(value: unknown): string | null {
	if (!value) return null;
	const inner = (value as { column?: unknown }).column ?? value;
	if (typeof inner === 'string') return inner;
	const expr = (inner as { expr?: { value?: unknown } })?.expr;
	if (expr && typeof expr.value === 'string') return expr.value;
	return null;
}

function extractReferenceTable(value: unknown): string | null {
	if (!value) return null;
	const inner = (value as { reference_definition?: unknown }).reference_definition ?? value;
	const tables = (inner as { table?: unknown }).table;
	const first = Array.isArray(tables) ? tables[0] : tables;
	const name = (first as { table?: unknown })?.table;
	return typeof name === 'string' ? name : null;
}

function extractDefault(value: unknown): string | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const inner = (value as { value?: { type?: string; value?: unknown } }).value;
	if (!inner) return undefined;
	if (typeof inner === 'string' || typeof inner === 'number' || typeof inner === 'boolean') return String(inner);
	const v = (inner as { value?: unknown }).value;
	if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
	if ((inner as { type?: string }).type === 'function') {
		const name = (inner as { name?: { name?: { value?: string }[] } }).name?.name?.[0]?.value ?? '';
		return name ? `${name.toUpperCase()}()` : undefined;
	}
	return undefined;
}
