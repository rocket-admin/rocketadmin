import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import sqlParser from 'node-sql-parser';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { connectionTypeToParserDialect } from '../../table-schema/utils/assert-dialect-supported.js';
import { MermaidTableInput } from './build-mermaid-er-diagram.util.js';

const { Parser } = sqlParser;

export interface SchemaDiff {
	addedTables: Set<string>;
	droppedTables: Set<string>;
	addedColumns: Map<string, Set<string>>;
	droppedColumns: Map<string, Set<string>>;
	addedForeignKeys: Map<string, Set<string>>;
	statementResults: Array<StatementResult>;
}

export interface StatementResult {
	sql: string;
	status: 'applied' | 'skipped' | 'error';
	message?: string;
}

export interface ApplyDdlResult {
	mutatedTables: Array<MermaidTableInput>;
	diff: SchemaDiff;
}

interface MutableTable extends MermaidTableInput {}

export function applyProposedDdl(
	tables: Array<MermaidTableInput>,
	sqlCommands: Array<string>,
	connectionType: ConnectionTypesEnum,
): ApplyDdlResult {
	const tableMap = new Map<string, MutableTable>();
	for (const table of tables) {
		tableMap.set(normalizeIdent(table.tableName), cloneTable(table));
	}

	const diff: SchemaDiff = {
		addedTables: new Set<string>(),
		droppedTables: new Set<string>(),
		addedColumns: new Map<string, Set<string>>(),
		droppedColumns: new Map<string, Set<string>>(),
		addedForeignKeys: new Map<string, Set<string>>(),
		statementResults: [],
	};

	const dialect = connectionTypeToParserDialect(connectionType);
	const parser = new Parser();

	for (const rawSql of sqlCommands) {
		const sql = (rawSql ?? '').trim();
		if (!sql) {
			diff.statementResults.push({ sql: rawSql, status: 'skipped', message: 'empty statement' });
			continue;
		}
		let ast: unknown;
		try {
			ast = parser.astify(sql, { database: dialect });
		} catch (err) {
			diff.statementResults.push({
				sql,
				status: 'error',
				message: `parse error: ${getErrorMessage(err)}`,
			});
			continue;
		}
		const statements = Array.isArray(ast) ? ast : [ast];
		for (const statement of statements) {
			try {
				const handled = applyStatement(statement, tableMap, diff);
				diff.statementResults.push(
					handled.applied
						? { sql, status: 'applied' }
						: { sql, status: 'skipped', message: handled.reason ?? 'unsupported statement' },
				);
			} catch (err) {
				diff.statementResults.push({
					sql,
					status: 'error',
					message: getErrorMessage(err),
				});
			}
		}
	}

	const mutatedTables = Array.from(tableMap.values());
	return { mutatedTables, diff };
}

function applyStatement(
	statement: any,
	tableMap: Map<string, MutableTable>,
	diff: SchemaDiff,
): { applied: boolean; reason?: string } {
	if (!statement || typeof statement !== 'object') {
		return { applied: false, reason: 'unrecognized statement' };
	}
	const type = String(statement.type ?? '').toLowerCase();
	const keyword = String(statement.keyword ?? '').toLowerCase();

	if (type === 'create' && keyword === 'table') {
		return applyCreateTable(statement, tableMap, diff);
	}
	if (type === 'drop' && keyword === 'table') {
		return applyDropTable(statement, tableMap, diff);
	}
	if (type === 'alter' && keyword === 'table') {
		return applyAlterTable(statement, tableMap, diff);
	}
	return { applied: false, reason: `unsupported statement type "${type} ${keyword}"` };
}

function applyCreateTable(
	statement: any,
	tableMap: Map<string, MutableTable>,
	diff: SchemaDiff,
): { applied: boolean; reason?: string } {
	const tableName = extractTableName(statement.table);
	if (!tableName) return { applied: false, reason: 'create table: cannot resolve table name' };
	const key = normalizeIdent(tableName);
	if (tableMap.has(key)) {
		return { applied: false, reason: `create table: "${tableName}" already exists` };
	}

	const newTable: MutableTable = {
		tableName,
		structure: [],
		primaryColumns: [],
		foreignKeys: [],
	};

	const defs: Array<any> = Array.isArray(statement.create_definitions) ? statement.create_definitions : [];
	for (const def of defs) {
		if (!def || typeof def !== 'object') continue;
		if (def.resource === 'column') {
			const colName = extractColumnName(def.column);
			if (!colName) continue;
			newTable.structure.push(buildColumnStructure(colName, def));
			if (def.primary_key) {
				newTable.primaryColumns.push({ column_name: colName, data_type: extractDataType(def.definition) });
			}
			const refFk = buildForeignKeyFromColumnRef(colName, def.reference_definition);
			if (refFk) newTable.foreignKeys.push(refFk);
		} else if (def.resource === 'constraint') {
			handleInlineConstraint(def, newTable);
		}
	}

	tableMap.set(key, newTable);
	diff.addedTables.add(tableName);
	for (const col of newTable.structure) {
		addToMapSet(diff.addedColumns, tableName, col.column_name);
	}
	for (const fk of newTable.foreignKeys) {
		addToMapSet(diff.addedForeignKeys, tableName, fkKey(fk));
	}
	return { applied: true };
}

function applyDropTable(
	statement: any,
	tableMap: Map<string, MutableTable>,
	diff: SchemaDiff,
): { applied: boolean; reason?: string } {
	const namesNode = Array.isArray(statement.name)
		? statement.name
		: Array.isArray(statement.table)
			? statement.table
			: [];
	let any = false;
	for (const node of namesNode) {
		const tableName = node?.table;
		if (!tableName) continue;
		const key = normalizeIdent(tableName);
		if (tableMap.has(key)) {
			tableMap.delete(key);
			diff.droppedTables.add(tableName);
			any = true;
		}
	}
	if (!any) return { applied: false, reason: 'drop table: no matching tables' };
	return { applied: true };
}

function applyAlterTable(
	statement: any,
	tableMap: Map<string, MutableTable>,
	diff: SchemaDiff,
): { applied: boolean; reason?: string } {
	const tableName = extractTableName(statement.table);
	if (!tableName) return { applied: false, reason: 'alter table: cannot resolve table name' };
	const key = normalizeIdent(tableName);
	const target = tableMap.get(key);
	if (!target) return { applied: false, reason: `alter table: "${tableName}" does not exist` };

	const exprs: Array<any> = Array.isArray(statement.expr) ? statement.expr : [];
	let appliedAny = false;
	const reasons: Array<string> = [];

	for (const expr of exprs) {
		if (!expr || typeof expr !== 'object') continue;
		const action = String(expr.action ?? '').toLowerCase();
		const resource = String(expr.resource ?? '').toLowerCase();

		if (action === 'add' && resource === 'column') {
			const colName = extractColumnName(expr.column);
			if (!colName) {
				reasons.push('add column: missing column name');
				continue;
			}
			if (target.structure.some((c) => normalizeIdent(c.column_name) === normalizeIdent(colName))) {
				reasons.push(`add column: "${colName}" already exists`);
				continue;
			}
			target.structure.push(buildColumnStructure(colName, expr));
			addToMapSet(diff.addedColumns, target.tableName, colName);
			const refFk = buildForeignKeyFromColumnRef(colName, expr.reference_definition);
			if (refFk) {
				target.foreignKeys.push(refFk);
				addToMapSet(diff.addedForeignKeys, target.tableName, fkKey(refFk));
			}
			appliedAny = true;
		} else if (action === 'drop' && resource === 'column') {
			const colName = extractColumnName(expr.column);
			if (!colName) {
				reasons.push('drop column: missing column name');
				continue;
			}
			const before = target.structure.length;
			target.structure = target.structure.filter((c) => normalizeIdent(c.column_name) !== normalizeIdent(colName));
			target.primaryColumns = target.primaryColumns.filter(
				(p) => normalizeIdent(p.column_name) !== normalizeIdent(colName),
			);
			target.foreignKeys = target.foreignKeys.filter(
				(fk) => normalizeIdent(fk.column_name) !== normalizeIdent(colName),
			);
			if (target.structure.length === before) {
				reasons.push(`drop column: "${colName}" not found`);
				continue;
			}
			addToMapSet(diff.droppedColumns, target.tableName, colName);
			appliedAny = true;
		} else if (action === 'add' && resource === 'constraint') {
			const cd = expr.create_definitions;
			if (cd && typeof cd === 'object') {
				const handled = handleInlineConstraint(cd, target);
				if (handled.added && handled.fk) {
					addToMapSet(diff.addedForeignKeys, target.tableName, fkKey(handled.fk));
					appliedAny = true;
				} else if (handled.reason) {
					reasons.push(handled.reason);
				}
			} else {
				reasons.push('add constraint: malformed definition');
			}
		} else if (action === 'drop' && resource === 'constraint') {
			const constraintName = expr.constraint;
			if (typeof constraintName === 'string') {
				const before = target.foreignKeys.length;
				target.foreignKeys = target.foreignKeys.filter((fk) => fk.constraint_name !== constraintName);
				if (target.foreignKeys.length !== before) appliedAny = true;
				else reasons.push(`drop constraint: "${constraintName}" not found`);
			} else {
				reasons.push('drop constraint: missing constraint name');
			}
		} else {
			reasons.push(`unsupported alter expression: action="${action}" resource="${resource}"`);
		}
	}

	if (!appliedAny) {
		return { applied: false, reason: reasons.join('; ') || 'no applicable alter expressions' };
	}
	return { applied: true };
}

function handleInlineConstraint(
	def: any,
	target: MutableTable,
): { added: boolean; fk?: ForeignKeyDS; reason?: string } {
	const constraintType = String(def?.constraint_type ?? '').toLowerCase();
	if (constraintType === 'primary key') {
		const cols: Array<string> = (Array.isArray(def.definition) ? def.definition : [])
			.map(extractColumnName)
			.filter((c: string | null): c is string => Boolean(c));
		for (const colName of cols) {
			if (!target.primaryColumns.some((p) => normalizeIdent(p.column_name) === normalizeIdent(colName))) {
				const col = target.structure.find((c) => normalizeIdent(c.column_name) === normalizeIdent(colName));
				target.primaryColumns.push({
					column_name: colName,
					data_type: col?.data_type ?? 'unknown',
				});
			}
		}
		return { added: cols.length > 0 };
	}
	if (constraintType === 'foreign key') {
		const sourceCols: Array<string> = (Array.isArray(def.definition) ? def.definition : [])
			.map(extractColumnName)
			.filter((c: string | null): c is string => Boolean(c));
		const ref = def.reference_definition;
		const refTable = extractTableName(ref?.table);
		const refCols: Array<string> = (Array.isArray(ref?.definition) ? ref.definition : [])
			.map(extractColumnName)
			.filter((c: string | null): c is string => Boolean(c));
		if (!refTable || sourceCols.length === 0) {
			return { added: false, reason: 'foreign key: missing referenced table or source columns' };
		}
		const constraintName =
			typeof def.constraint === 'string' ? def.constraint : `fk_${target.tableName}_${sourceCols.join('_')}`;
		const fk: ForeignKeyDS = {
			column_name: sourceCols[0],
			referenced_column_name: refCols[0] ?? 'id',
			referenced_table_name: refTable,
			constraint_name: constraintName,
		};
		target.foreignKeys.push(fk);
		return { added: true, fk };
	}
	return { added: false, reason: `unsupported inline constraint "${constraintType}"` };
}

function buildColumnStructure(colName: string, def: any): TableStructureDS {
	const dataType = extractDataType(def?.definition);
	const notNull = def?.nullable && String(def.nullable.type).toLowerCase().includes('not null');
	const defaultVal = extractDefault(def?.default_val);
	return {
		column_name: colName,
		data_type: dataType,
		data_type_params: '',
		udt_name: dataType,
		allow_null: !notNull,
		character_maximum_length: typeof def?.definition?.length === 'number' ? def.definition.length : null,
		column_default: defaultVal,
	};
}

function extractDataType(definition: any): string {
	if (!definition || typeof definition !== 'object') return 'unknown';
	const dt = definition.dataType;
	return typeof dt === 'string' && dt.length > 0 ? dt.toLowerCase() : 'unknown';
}

function extractDefault(defaultVal: any): string | null {
	if (!defaultVal || typeof defaultVal !== 'object') return null;
	const v = defaultVal.value;
	if (v && typeof v === 'object') {
		if ('value' in v) {
			const inner = (v as { value: unknown }).value;
			return inner === null || inner === undefined ? null : String(inner);
		}
	}
	return null;
}

function buildForeignKeyFromColumnRef(colName: string, referenceDefinition: any): ForeignKeyDS | null {
	if (!referenceDefinition || typeof referenceDefinition !== 'object') return null;
	const refTable = extractTableName(referenceDefinition.table);
	const refCols: Array<string> = (Array.isArray(referenceDefinition.definition) ? referenceDefinition.definition : [])
		.map(extractColumnName)
		.filter((c: string | null): c is string => Boolean(c));
	if (!refTable) return null;
	return {
		column_name: colName,
		referenced_table_name: refTable,
		referenced_column_name: refCols[0] ?? 'id',
		constraint_name: `fk_${colName}_${refTable}`,
	};
}

function extractTableName(tableNode: any): string | null {
	if (!Array.isArray(tableNode) || tableNode.length === 0) return null;
	const first = tableNode[0];
	if (first && typeof first === 'object' && typeof first.table === 'string') return first.table;
	return null;
}

function extractColumnName(columnNode: any): string | null {
	if (!columnNode || typeof columnNode !== 'object') return null;
	if (typeof columnNode === 'string') return columnNode;
	const col = (columnNode as Record<string, unknown>).column;
	if (typeof col === 'string') return col;
	if (col && typeof col === 'object') {
		const expr = (col as Record<string, unknown>).expr;
		if (expr && typeof expr === 'object') {
			const value = (expr as Record<string, unknown>).value;
			if (typeof value === 'string') return value;
		}
	}
	return null;
}

function normalizeIdent(name: string): string {
	return name.replace(/^[`"[]|[`"\]]$/g, '').toLowerCase();
}

function cloneTable(t: MermaidTableInput): MutableTable {
	return {
		tableName: t.tableName,
		structure: t.structure.map((c) => ({ ...c })),
		primaryColumns: t.primaryColumns.map((p) => ({ ...p })),
		foreignKeys: t.foreignKeys.map((f) => ({ ...f })),
	};
}

function addToMapSet(map: Map<string, Set<string>>, key: string, value: string): void {
	let set = map.get(key);
	if (!set) {
		set = new Set<string>();
		map.set(key, set);
	}
	set.add(value);
}

function fkKey(fk: ForeignKeyDS): string {
	return `${fk.column_name}->${fk.referenced_table_name}.${fk.referenced_column_name}`;
}

// Re-export types used in payloads
export type { PrimaryKeyDS, TableStructureDS };
