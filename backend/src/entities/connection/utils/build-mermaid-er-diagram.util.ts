import { ForeignKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export interface MermaidTableInput {
	tableName: string;
	structure: Array<TableStructureDS>;
	primaryColumns: Array<PrimaryKeyDS>;
	foreignKeys: Array<ForeignKeyDS>;
}

export interface MermaidDiagramResult {
	diagram: string;
	description: string;
}

export interface MermaidDiagramHighlight {
	addedTables?: Set<string>;
	addedColumns?: Map<string, Set<string>>;
	addedForeignKeys?: Map<string, Set<string>>;
}

const ADDED_CLASS_NAME = 'addedEntity';
const ADDED_CLASS_DEF = `    classDef ${ADDED_CLASS_NAME} fill:#d4edda,stroke:#28a745,color:#155724`;
const ADDED_COLUMN_MARKER = 'NEW';
const ADDED_FK_MARKER = '[NEW]';

export function buildMermaidErDiagram(
	databaseName: string | null,
	tables: Array<MermaidTableInput>,
	highlight?: MermaidDiagramHighlight,
): MermaidDiagramResult {
	const aliasByTable = new Map<string, string>();
	const usedAliases = new Set<string>();
	for (const t of tables) {
		aliasByTable.set(t.tableName, makeUniqueAlias(t.tableName, usedAliases));
	}

	const addedTablesNorm = normalizeSet(highlight?.addedTables);
	const addedColumnsNorm = normalizeMap(highlight?.addedColumns);
	const addedFksNorm = normalizeMap(highlight?.addedForeignKeys);

	const lines: Array<string> = ['erDiagram'];

	for (const table of tables) {
		const alias = aliasByTable.get(table.tableName)!;
		const pkColumnNames = new Set(table.primaryColumns.map((p) => p.column_name));
		const fkColumnNames = new Set(table.foreignKeys.map((fk) => fk.column_name));
		const tableAddedCols = addedColumnsNorm.get(normalizeIdent(table.tableName)) ?? new Set<string>();

		const aliasDiffersFromOriginal = alias !== table.tableName;
		const header = aliasDiffersFromOriginal
			? `    ${alias}["${sanitizeQuotedText(table.tableName)}"] {`
			: `    ${alias} {`;
		lines.push(header);

		if (table.structure.length === 0) {
			lines.push('        string _empty_ "no columns"');
		} else {
			for (const column of table.structure) {
				const dataType = toAttributeWord(column.data_type || column.udt_name || 'unknown');
				const colName = toAttributeWord(column.column_name);
				const markers: Array<string> = [];
				if (pkColumnNames.has(column.column_name)) markers.push('PK');
				if (fkColumnNames.has(column.column_name)) markers.push('FK');
				if (tableAddedCols.has(normalizeIdent(column.column_name))) markers.push(ADDED_COLUMN_MARKER);
				const comment = buildColumnComment(column);
				const tail = [markers.join(','), comment].filter((p) => p && p.length > 0).join(' ');
				lines.push(`        ${dataType} ${colName}${tail ? ' ' + tail : ''}`);
			}
		}
		lines.push('    }');
	}

	let relationshipCount = 0;
	for (const table of tables) {
		const sourceAlias = aliasByTable.get(table.tableName)!;
		const tableAddedFks = addedFksNorm.get(normalizeIdent(table.tableName)) ?? new Set<string>();
		for (const fk of table.foreignKeys) {
			const targetAlias = aliasByTable.get(fk.referenced_table_name);
			if (!targetAlias) continue;
			const isAdded = tableAddedFks.has(fkKey(fk));
			const labelText = `${sanitizeQuotedText(fk.column_name)} -> ${sanitizeQuotedText(fk.referenced_column_name)}${isAdded ? ' ' + ADDED_FK_MARKER : ''}`;
			lines.push(`    ${sourceAlias} }o--|| ${targetAlias} : "${labelText}"`);
			relationshipCount++;
		}
	}

	const addedAliases: Array<string> = [];
	for (const table of tables) {
		if (addedTablesNorm.has(normalizeIdent(table.tableName))) {
			addedAliases.push(aliasByTable.get(table.tableName)!);
		}
	}
	if (addedAliases.length > 0) {
		lines.push(ADDED_CLASS_DEF);
		for (const alias of addedAliases) {
			lines.push(`    class ${alias} ${ADDED_CLASS_NAME}`);
		}
	}

	const diagram = lines.join('\n');
	const description = buildDescription(databaseName, tables, relationshipCount, {
		addedTables: addedTablesNorm,
		addedColumns: addedColumnsNorm,
		addedForeignKeys: addedFksNorm,
	});
	return { diagram, description };
}

interface BuildDescriptionHighlight {
	addedTables: Set<string>;
	addedColumns: Map<string, Set<string>>;
	addedForeignKeys: Map<string, Set<string>>;
}

function buildDescription(
	databaseName: string | null,
	tables: Array<MermaidTableInput>,
	relationshipCount: number,
	highlight: BuildDescriptionHighlight,
): string {
	const dbLabel = databaseName ? `Database "${databaseName}"` : 'Database';
	const tablesPart = `${tables.length} ${pluralize(tables.length, 'table', 'tables')}`;
	const relsPart = `${relationshipCount} ${pluralize(relationshipCount, 'foreign key relationship', 'foreign key relationships')}`;
	const header = `${dbLabel} contains ${tablesPart} and ${relsPart}.`;

	if (tables.length === 0) {
		return header;
	}

	const tableSummaries = tables.map((t) => {
		const pkNames = t.primaryColumns.map((p) => p.column_name);
		const pkPart = pkNames.length > 0 ? `PK: ${pkNames.join(', ')}` : 'no primary key';
		const fkPart =
			t.foreignKeys.length > 0
				? `FKs: ${t.foreignKeys.map((fk) => `${fk.column_name}->${fk.referenced_table_name}.${fk.referenced_column_name}`).join(', ')}`
				: 'no foreign keys';
		const isNewTable = highlight.addedTables.has(normalizeIdent(t.tableName));
		const newCols = highlight.addedColumns.get(normalizeIdent(t.tableName));
		const newFks = highlight.addedForeignKeys.get(normalizeIdent(t.tableName));
		const markers: Array<string> = [];
		if (isNewTable) markers.push('NEW TABLE');
		if (newCols && newCols.size > 0 && !isNewTable) markers.push(`new columns: ${Array.from(newCols).join(', ')}`);
		if (newFks && newFks.size > 0 && !isNewTable) markers.push(`new FKs: ${Array.from(newFks).join(', ')}`);
		const markerSuffix = markers.length > 0 ? ` [${markers.join('; ')}]` : '';
		return `- ${t.tableName} (${t.structure.length} ${pluralize(t.structure.length, 'column', 'columns')}; ${pkPart}; ${fkPart})${markerSuffix}`;
	});

	return [header, 'Tables:', ...tableSummaries].join('\n');
}

function pluralize(n: number, singular: string, plural: string): string {
	return n === 1 ? singular : plural;
}

function buildColumnComment(column: TableStructureDS): string {
	const parts: Array<string> = [];
	if (column.column_default !== null && column.column_default !== undefined && column.column_default !== '') {
		parts.push(`default: ${String(column.column_default)}`);
	}
	parts.push(column.allow_null ? 'nullable' : 'not null');
	if (column.character_maximum_length) {
		parts.push(`max length: ${column.character_maximum_length}`);
	}
	const text = parts.join('; ');
	return text ? `"${sanitizeQuotedText(text)}"` : '';
}

const MERMAID_ENTITY_RESERVED_WORDS = new Set<string>([
	'erDiagram',
	'style',
	'class',
	'classDef',
	'one',
	'many',
	'to',
	'zero',
]);

const MERMAID_ATTRIBUTE_KEY_WORDS = new Set<string>(['PK', 'FK', 'UK']);

function makeUniqueAlias(name: string, used: Set<string>): string {
	const base = toEntityAlias(name);
	let candidate = base;
	let suffix = 1;
	while (used.has(candidate)) {
		candidate = `${base}_${suffix++}`;
	}
	used.add(candidate);
	return candidate;
}

function toEntityAlias(value: string): string {
	const sanitized = sanitizeIdentifier(value);
	if (sanitized.length === 0 || /^[0-9]/.test(sanitized) || MERMAID_ENTITY_RESERVED_WORDS.has(sanitized)) {
		return `t_${sanitized}`;
	}
	return sanitized;
}

function toAttributeWord(value: string): string {
	const sanitized = sanitizeIdentifier(value);
	if (sanitized.length === 0 || /^[0-9]/.test(sanitized) || MERMAID_ATTRIBUTE_KEY_WORDS.has(sanitized)) {
		return `_${sanitized}`;
	}
	return sanitized;
}

function sanitizeIdentifier(value: string): string {
	return value.replace(/[^A-Za-z0-9_]/g, '_');
}

function sanitizeQuotedText(value: string): string {
	return value.replace(/"/g, "'").replace(/[\r\n\t]+/g, ' ');
}

function normalizeIdent(name: string): string {
	return name.replace(/^[`"[]|[`"\]]$/g, '').toLowerCase();
}

function normalizeSet(input?: Set<string>): Set<string> {
	const out = new Set<string>();
	if (!input) return out;
	for (const v of input) out.add(normalizeIdent(v));
	return out;
}

function normalizeMap(input?: Map<string, Set<string>>): Map<string, Set<string>> {
	const out = new Map<string, Set<string>>();
	if (!input) return out;
	for (const [k, set] of input.entries()) {
		const normalized = new Set<string>();
		for (const v of set) normalized.add(normalizeIdent(v));
		out.set(normalizeIdent(k), normalized);
	}
	return out;
}

function fkKey(fk: ForeignKeyDS): string {
	return `${fk.column_name}->${fk.referenced_table_name}.${fk.referenced_column_name}`;
}
