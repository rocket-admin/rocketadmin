import { describe, expect, it } from 'vitest';
import type { SchemaChangeResponse } from '@/stores/table-schema';
import { changeMeta, mermaidHasEntities, parseChange, parseCreateTableColumns, summarizeError } from './schemaChanges';

function change(overrides: Partial<SchemaChangeResponse>): SchemaChangeResponse {
	return {
		id: 'ch1',
		connectionId: 'c1',
		batchId: 'b1',
		orderInBatch: 0,
		forwardSql: '',
		rollbackSql: null,
		userModifiedSql: null,
		status: 'pending',
		changeType: 'CREATE_TABLE',
		targetTableName: 'users',
		databaseType: 'postgres',
		executionError: null,
		isReversible: true,
		userPrompt: 'x',
		aiSummary: null,
		aiReasoning: null,
		createdAt: '',
		appliedAt: null,
		rolledBackAt: null,
		...overrides,
	};
}

describe('schemaChanges', () => {
	it('maps known change types and sentence-cases unknown ones', () => {
		expect(changeMeta('drop_table')).toEqual({ action: 'Drop table', icon: 'delete_outline', tone: 'remove' });
		expect(changeMeta('ADD_FOREIGN_KEY')).toEqual({ action: 'Add foreign key', icon: 'link', tone: 'add' });
		expect(changeMeta('RENAME_TABLE')).toEqual({ action: 'Rename table', icon: 'code', tone: 'edit' });
	});

	it('reads the columns of a CREATE TABLE, with table-level PK and FK constraints', async () => {
		const columns = await parseCreateTableColumns(
			`CREATE TABLE orders (
				id SERIAL,
				customer_id INTEGER NOT NULL,
				code VARCHAR(20) UNIQUE,
				status VARCHAR(10) DEFAULT 'new',
				PRIMARY KEY (id),
				FOREIGN KEY (customer_id) REFERENCES customers(id)
			)`,
		);
		expect(columns.map((c) => c.name)).toEqual(['id', 'customer_id', 'code', 'status']);
		expect(columns[0]).toMatchObject({ pk: true, type: 'serial' });
		expect(columns[1]).toMatchObject({ fk: true, referenceTable: 'customers', notNull: true, pk: false });
		expect(columns[2]).toMatchObject({ unique: true });
		expect(columns[3]).toMatchObject({ defaultValue: 'new' });
	});

	it('returns no columns for SQL it cannot parse, and parses only CREATE_TABLE changes', async () => {
		expect(await parseCreateTableColumns('not sql at all')).toEqual([]);
		const parsed = await parseChange(
			change({ changeType: 'ADD_COLUMN', forwardSql: 'ALTER TABLE users ADD COLUMN age INT', aiSummary: 'Adds age' }),
		);
		expect(parsed).toMatchObject({ action: 'Add column', tone: 'add', aiSummary: 'Adds age', columns: [] });
	});

	it('detects entities in a mermaid ER source', () => {
		expect(mermaidHasEntities('erDiagram\n  users {\n    int id\n  }')).toBe(true);
		expect(mermaidHasEntities('erDiagram\n')).toBe(false);
		expect(mermaidHasEntities('')).toBe(false);
	});

	it('summarizes errors to one line of at most 120 characters', () => {
		expect(summarizeError(null)).toBe('unknown error');
		expect(summarizeError('  relation\n  "x"   missing ')).toBe('relation "x" missing');
		expect(summarizeError('a'.repeat(200))).toBe(`${'a'.repeat(120)}…`);
	});
});
