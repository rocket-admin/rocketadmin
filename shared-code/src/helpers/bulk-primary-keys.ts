import { Knex } from 'knex';
import { ERROR_MESSAGES } from './errors/error-messages.js';

/**
 * Primary keys of a bulk operation, normalised to one column list and one value row per key, in
 * the column order of the first key. Every key must carry exactly the same columns.
 */
export type NormalisedPrimaryKeys = {
	columns: Array<string>;
	rows: Array<Array<unknown>>;
};

/** Per-dialect limits that bound how many keys a single statement may carry. */
export type BulkPrimaryKeysLimits = {
	/** Cap on keys per statement regardless of the number of key columns. */
	maxKeysPerStatement: number;
	/** Cap on bound values per statement (every key column of every key binds one value). */
	maxBindingsPerStatement: number;
};

export const BULK_PRIMARY_KEYS_LIMITS = {
	/** The extended-query protocol caps bind parameters at 65535. */
	postgres: { maxKeysPerStatement: 1000, maxBindingsPerStatement: 60000 },
	/** Prepared-statement placeholders cap at 65535. */
	mysql: { maxKeysPerStatement: 1000, maxBindingsPerStatement: 60000 },
	/** A request takes at most 2100 parameters. */
	mssql: { maxKeysPerStatement: 1000, maxBindingsPerStatement: 2000 },
	/** ORA-01795: an IN list takes at most 1000 expressions. */
	oracle: { maxKeysPerStatement: 1000, maxBindingsPerStatement: 1000 },
} as const satisfies Record<string, BulkPrimaryKeysLimits>;

export function normalisePrimaryKeys(primaryKeys: Array<Record<string, unknown>>): NormalisedPrimaryKeys {
	if (primaryKeys.length === 0) {
		return { columns: [], rows: [] };
	}
	const columns = Object.keys(primaryKeys[0]);
	if (columns.length === 0) {
		throw new Error(ERROR_MESSAGES.PRIMARY_KEY_EMPTY);
	}
	const rows = primaryKeys.map((primaryKey) => {
		const keyColumns = Object.keys(primaryKey);
		if (keyColumns.length !== columns.length || !columns.every((column) => keyColumns.includes(column))) {
			throw new Error(ERROR_MESSAGES.PRIMARY_KEYS_COLUMNS_MISMATCH);
		}
		// eslint-disable-next-line security/detect-object-injection
		return columns.map((column) => primaryKey[column]);
	});
	return { columns, rows };
}

/** Splits normalised key rows into statement-sized chunks for the given dialect limits. */
export function chunkPrimaryKeyRows(
	{ columns, rows }: NormalisedPrimaryKeys,
	limits: BulkPrimaryKeysLimits,
): Array<Array<Array<unknown>>> {
	if (rows.length === 0) {
		return [];
	}
	const chunkSize = Math.max(
		1,
		Math.min(limits.maxKeysPerStatement, Math.floor(limits.maxBindingsPerStatement / columns.length)),
	);
	const chunks: Array<Array<Array<unknown>>> = [];
	for (let i = 0; i < rows.length; i += chunkSize) {
		chunks.push(rows.slice(i, i + chunkSize));
	}
	return chunks;
}

/**
 * Restricts the query to the given keys with one list predicate instead of one OR-ed group per key:
 * `col IN (…)` for a single key column, `(a, b) IN ((…), (…))` for composite keys where the dialect
 * has row-value constructors, and a grouped `(a = ? AND b = ?) OR …` where it has not (MSSQL).
 * A key with a `null` component never matches through IN (`NULL IN (NULL)` is unknown), so such
 * keys are always emitted as a group with `IS NULL` for the null columns.
 */
export function applyPrimaryKeysFilter<T extends Knex.QueryBuilder>(
	queryBuilder: T,
	columns: Array<string>,
	rows: Array<Array<unknown>>,
	rowValueIn: boolean,
): T {
	const listRows = rows.filter((row) => !hasNullComponent(row));
	const nullRows = rows.filter((row) => hasNullComponent(row));
	const useList = listRows.length > 0 && (columns.length === 1 || rowValueIn);
	if (useList && nullRows.length === 0) {
		return whereInKeys(queryBuilder, columns, listRows) as T;
	}
	return queryBuilder.where((group) => {
		if (useList) {
			whereInKeys(group, columns, listRows);
		}
		for (const row of useList ? nullRows : rows) {
			group.orWhere((key) => {
				columns.forEach((column, index) => {
					// eslint-disable-next-line security/detect-object-injection
					key.andWhere(column, row[index] as Knex.Value);
				});
			});
		}
	}) as T;
}

function hasNullComponent(row: Array<unknown>): boolean {
	return row.some((value) => value === null);
}

function whereInKeys(
	queryBuilder: Knex.QueryBuilder,
	columns: Array<string>,
	rows: Array<Array<unknown>>,
): Knex.QueryBuilder {
	if (columns.length === 1) {
		return queryBuilder.whereIn(
			columns[0],
			rows.map((row) => row[0] as Knex.Value),
		);
	}
	return queryBuilder.whereIn(columns, rows as Array<Array<Knex.Value>>);
}
