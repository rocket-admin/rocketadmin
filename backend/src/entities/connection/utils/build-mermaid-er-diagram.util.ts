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

export function buildMermaidErDiagram(
	databaseName: string | null,
	tables: Array<MermaidTableInput>,
): MermaidDiagramResult {
	const aliasByTable = new Map<string, string>();
	const usedAliases = new Set<string>();
	for (const t of tables) {
		aliasByTable.set(t.tableName, makeUniqueAlias(t.tableName, usedAliases));
	}

	const lines: Array<string> = ['erDiagram'];

	for (const table of tables) {
		const alias = aliasByTable.get(table.tableName)!;
		const pkColumnNames = new Set(table.primaryColumns.map((p) => p.column_name));
		const fkColumnNames = new Set(table.foreignKeys.map((fk) => fk.column_name));

		const aliasDiffersFromOriginal = alias !== table.tableName;
		const header = aliasDiffersFromOriginal ? `    ${alias}["${escapeQuotes(table.tableName)}"] {` : `    ${alias} {`;
		lines.push(header);

		if (table.structure.length === 0) {
			lines.push('        string _empty_ "no columns"');
		} else {
			for (const column of table.structure) {
				const dataType = sanitizeIdentifier(column.data_type || column.udt_name || 'unknown');
				const colName = sanitizeIdentifier(column.column_name);
				const markers: Array<string> = [];
				if (pkColumnNames.has(column.column_name)) markers.push('PK');
				if (fkColumnNames.has(column.column_name)) markers.push('FK');
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
		for (const fk of table.foreignKeys) {
			const targetAlias = aliasByTable.get(fk.referenced_table_name);
			if (!targetAlias) continue;
			const label = `"${escapeQuotes(fk.column_name)} -> ${escapeQuotes(fk.referenced_column_name)}"`;
			lines.push(`    ${sourceAlias} }o--|| ${targetAlias} : ${label}`);
			relationshipCount++;
		}
	}

	const diagram = lines.join('\n');
	const description = buildDescription(databaseName, tables, relationshipCount);
	return { diagram, description };
}

function buildDescription(
	databaseName: string | null,
	tables: Array<MermaidTableInput>,
	relationshipCount: number,
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
		return `- ${t.tableName} (${t.structure.length} ${pluralize(t.structure.length, 'column', 'columns')}; ${pkPart}; ${fkPart})`;
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
	return text ? `"${escapeQuotes(text)}"` : '';
}

function makeUniqueAlias(name: string, used: Set<string>): string {
	let base = sanitizeIdentifier(name);
	if (base.length === 0 || /^[0-9]/.test(base)) base = `t_${base}`;
	let candidate = base;
	let suffix = 1;
	while (used.has(candidate)) {
		candidate = `${base}_${suffix++}`;
	}
	used.add(candidate);
	return candidate;
}

function sanitizeIdentifier(value: string): string {
	return value.replace(/[^A-Za-z0-9_]/g, '_');
}

function escapeQuotes(value: string): string {
	return value.replace(/"/g, "'");
}
