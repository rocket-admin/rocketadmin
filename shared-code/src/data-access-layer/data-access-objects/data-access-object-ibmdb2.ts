import * as csv from 'csv';
import getPort from 'get-port';
import { Database, Pool, SQLParam } from 'ibm_db';
import { nanoid } from 'nanoid';
import { Readable, Stream } from 'node:stream';
import { LRUStorage } from '../../caching/lru-storage.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { getTunnel } from '../../helpers/get-ssh-tunnel.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { RowsPaginationDS } from '../shared/data-structures/rows-pagination.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { FilterCriteriaEnum } from '../../shared/enums/filter-criteria.enum.js';
import { IDataAccessObject } from '../../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';

interface IbmDb2Row {
	COLUMN_NAME: string;
	DATA_TYPE: string;
	CONSTRAINT_NAME?: string;
	REFERENCED_TABLE_NAME?: string;
	REFERENCED_COLUMN_NAME?: string;
	IS_NULLABLE?: string;
	COLUMN_DEFAULT?: string;
	CHARACTER_MAXIMUM_LENGTH?: number;
	TABLE_NAME?: string;
	TABLE_TYPE?: string;
	REFERENCING_TABLE_NAME?: string;
	REFERENCING_COLUMN_NAME?: string;
}

export class DataAccessObjectIbmDb2 extends BasicDataAccessObject implements IDataAccessObject {
	public async addRowInTable(
		tableName: string,
		row: Record<string, unknown>,
	): Promise<number | Record<string, unknown>> {
		this.validateNamesAndThrowError([tableName, this.connection.schema, ...Object.keys(row)]);
		const connectionToDb = await this.getConnectionToDatabase();
		const [tableStructure, primaryColumns] = await Promise.all([
			this.getTableStructure(tableName),
			this.getTablePrimaryColumns(tableName),
		]);

		const jsonColumnNames = tableStructure
			.filter((structEl) => structEl.data_type.toLowerCase() === 'json')
			.map((structEl) => structEl.column_name);

		for (const key in row) {
			if (jsonColumnNames.includes(key)) {
				// eslint-disable-next-line security/detect-object-injection
				row[key] = JSON.stringify(row[key]);
			}
		}

		const columns = Object.keys(row).join(', ');
		const placeholders = Object.keys(row)
			.map(() => '?')
			.join(', ');
		const values = Object.values(row) as SQLParam[];
		const query = `
    INSERT INTO ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()} (${columns})
    VALUES (${placeholders})
  `;
		await connectionToDb.query(query, values);

		if (primaryColumns?.length > 0) {
			const primaryKey = primaryColumns.map((column) => column.column_name);
			const selectQuery = `
      SELECT ${primaryKey.join(', ')}
      FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
      WHERE ${Object.keys(row)
				.map((key) => `${key} = ?`)
				.join(' AND ')}
    `;
			const result = await connectionToDb.query(selectQuery, Object.values(row) as SQLParam[]);
			return result[0] as Record<string, unknown>;
		}
		return row;
	}

	public async deleteRowInTable(
		tableName: string,
		primaryKey: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		this.validateNamesAndThrowError([tableName, this.connection.schema, ...Object.keys(primaryKey)]);
		const connectionToDb = await this.getConnectionToDatabase();
		const whereClause = Object.keys(primaryKey)
			.map((key) => `${key} = ?`)
			.join(' AND ');
		const query = `
    DELETE FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
    WHERE ${whereClause}
  `;
		const params = Object.values(primaryKey) as SQLParam[];
		await connectionToDb.query(query, params);
		return primaryKey;
	}

	public async getIdentityColumns(
		tableName: string,
		referencedFieldName: string,
		identityColumnName: string,
		fieldValues: (string | number)[],
	): Promise<Array<Record<string, unknown>>> {
		const schemaName = this.connection.schema.toUpperCase();
		const namesToValidate = [tableName, referencedFieldName, schemaName];
		if (identityColumnName) {
			namesToValidate.push(identityColumnName);
		}
		this.validateNamesAndThrowError(namesToValidate);
		const connectionToDb = await this.getConnectionToDatabase();
		const columnsToSelect = identityColumnName ? `${referencedFieldName}, ${identityColumnName}` : referencedFieldName;
		const placeholders = fieldValues.map(() => '?').join(', ');
		const query = `
      SELECT ${columnsToSelect} 
      FROM ${schemaName}.${tableName.toUpperCase()}
      WHERE ${referencedFieldName} IN (${placeholders})
    `;
		const result = await connectionToDb.query(query, [...fieldValues] as SQLParam[]);
		return result as Record<string, unknown>[];
	}

	public async getRowByPrimaryKey(
		tableName: string,
		primaryKey: Record<string, unknown>,
		settings: TableSettingsDS,
	): Promise<Record<string, unknown>> {
		this.validateNamesAndThrowError([tableName, this.connection.schema, ...Object.keys(primaryKey)]);
		const connectionToDb = await this.getConnectionToDatabase();
		const whereClause = Object.keys(primaryKey)
			.map((key) => `${key} = ?`)
			.join(' AND ');
		let selectFields = '*';
		if (settings) {
			const tableStructure = await this.getTableStructure(tableName);
			const availableFields = this.findAvailableFields(settings, tableStructure);
			selectFields = availableFields.join(', ');
		}
		const query = `
    SELECT ${selectFields} 
    FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
    WHERE ${whereClause}
  `;
		const params = Object.values(primaryKey) as SQLParam[];
		const result = await connectionToDb.query(query, params);
		return result[0] as Record<string, unknown>;
	}

	public async bulkGetRowsFromTableByPrimaryKeys(
		tableName: string,
		primaryKeys: Array<Record<string, unknown>>,
		settings: TableSettingsDS,
	): Promise<Array<Record<string, unknown>>> {
		this.validateNamesAndThrowError([tableName, this.connection.schema, ...primaryKeys.flatMap(Object.keys)]);

		const connectionToDb = await this.getConnectionToDatabase();
		const schemaName = this.connection.schema.toUpperCase();
		tableName = tableName.toUpperCase();

		let selectFields = '*';
		if (settings) {
			const tableStructure = await this.getTableStructure(tableName);
			const availableFields = this.findAvailableFields(settings, tableStructure);
			selectFields = availableFields.join(', ');
		}

		const whereClauses = primaryKeys
			.map((primaryKey) => {
				const conditions = Object.entries(primaryKey)
					.map(([key, _value]) => `${key} = ?`)
					.join(' AND ');
				return `(${conditions})`;
			})
			.join(' OR ');

		const flatPrimaryKeysValues = primaryKeys.flatMap(Object.values) as SQLParam[];

		const query = `
      SELECT ${selectFields}
      FROM ${schemaName}.${tableName}
      WHERE ${whereClauses}
    `;

		const results = await connectionToDb.query(query, flatPrimaryKeysValues);
		return results as Record<string, unknown>[];
	}

	public async getRowsFromTable(
		tableName: string,
		settings: TableSettingsDS,
		page: number,
		perPage: number,
		searchedFieldValue: string,
		filteringFields: FilteringFieldsDS[],
		autocompleteFields: AutocompleteFieldsDS,
		tableStructure: TableStructureDS[] | null,
	): Promise<FoundRowsDS> {
		const connectionSchema = this.connection.schema.toUpperCase();
		tableName = tableName.toUpperCase();
		this.validateNamesAndThrowError([tableName, connectionSchema]);

		if (!page || page <= 0) {
			page = DAO_CONSTANTS.DEFAULT_PAGINATION.page;
			const { list_per_page } = settings;
			if (list_per_page && list_per_page > 0 && (!perPage || perPage <= 0)) {
				perPage = list_per_page;
			} else {
				perPage = DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;
			}
		}
		const connectionToDb = await this.getConnectionToDatabase();

		const { large_dataset, rowsCount } = await this.getRowsCount(tableName, this.connection.schema);
		if (!tableStructure) {
			tableStructure = await this.getTableStructure(tableName);
		}
		const availableFields = this.findAvailableFields(settings, tableStructure);

		const lastPage = Math.ceil(rowsCount / perPage);
		let rowsRO: FoundRowsDS;

		const queryParams: SQLParam[] = [];

		if (autocompleteFields?.value && autocompleteFields.fields.length > 0) {
			const validatedAutocompleteFields = autocompleteFields.fields.filter((field) => availableFields.includes(field));
			if (validatedAutocompleteFields.length === 0) {
				throw new Error('Invalid autocomplete fields provided');
			}
			this.validateNamesAndThrowError(validatedAutocompleteFields);
			const fields = validatedAutocompleteFields.join(', ');
			const autocompleteConditions = validatedAutocompleteFields.map((field) => `${field} LIKE ?`).join(' OR ');
			const autocompleteQuery = `SELECT ${fields} FROM ${connectionSchema}.${tableName} WHERE ${autocompleteConditions} FETCH FIRST ${DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT} ROWS ONLY`;
			const autocompleteParams = validatedAutocompleteFields.map(() => `${autocompleteFields.value}%`);
			const rows = await connectionToDb.query(autocompleteQuery, autocompleteParams);

			rowsRO = {
				data: rows as Record<string, unknown>[],
				pagination: {} as RowsPaginationDS,
				large_dataset: large_dataset,
			};
			return rowsRO;
		}

		let searchQuery = '';
		if (searchedFieldValue) {
			const searchFields = settings.search_fields?.length > 0 ? settings.search_fields : availableFields;
			const validatedSearchFields = searchFields.filter((field) => availableFields.includes(field));
			this.validateNamesAndThrowError(validatedSearchFields);
			if (rowsCount <= 1000) {
				const searchConditions = validatedSearchFields
					.map((field) => {
						queryParams.push(`%${searchedFieldValue.toLowerCase()}%`);
						return `LOWER(CAST(${field} AS VARCHAR(255))) LIKE ?`;
					})
					.join(' OR ');
				searchQuery = ` WHERE (${searchConditions})`;
			} else {
				const searchConditions = validatedSearchFields
					.map((field) => {
						queryParams.push(`${searchedFieldValue.toLowerCase()}%`);
						return `LOWER(CAST(${field} AS VARCHAR(255))) LIKE ?`;
					})
					.join(' OR ');
				searchQuery = ` WHERE (${searchConditions})`;
			}
		}

		let filterQuery = '';
		if (filteringFields && filteringFields.length > 0) {
			const invalidFields = filteringFields.filter((f) => !availableFields.includes(f.field));
			if (invalidFields.length > 0) {
				throw new Error(`Invalid filter fields: ${invalidFields.map((f) => f.field).join(', ')}`);
			}
			this.validateNamesAndThrowError(filteringFields.map((f) => f.field));

			const filterConditions = filteringFields
				.map((filterObject) => {
					switch (filterObject.criteria) {
						case FilterCriteriaEnum.eq:
							queryParams.push(filterObject.value as SQLParam);
							return `${filterObject.field} = ?`;
						case FilterCriteriaEnum.startswith:
							queryParams.push(`${filterObject.value}%`);
							return `${filterObject.field} LIKE ?`;
						case FilterCriteriaEnum.endswith:
							queryParams.push(`%${filterObject.value}`);
							return `${filterObject.field} LIKE ?`;
						case FilterCriteriaEnum.gt:
							queryParams.push(filterObject.value as SQLParam);
							return `${filterObject.field} > ?`;
						case FilterCriteriaEnum.lt:
							queryParams.push(filterObject.value as SQLParam);
							return `${filterObject.field} < ?`;
						case FilterCriteriaEnum.lte:
							queryParams.push(filterObject.value as SQLParam);
							return `${filterObject.field} <= ?`;
						case FilterCriteriaEnum.gte:
							queryParams.push(filterObject.value as SQLParam);
							return `${filterObject.field} >= ?`;
						case FilterCriteriaEnum.contains:
							queryParams.push(`%${filterObject.value}%`);
							return `${filterObject.field} LIKE ?`;
						case FilterCriteriaEnum.icontains:
							queryParams.push(`%${filterObject.value}%`);
							return `${filterObject.field} NOT LIKE ?`;
						case FilterCriteriaEnum.empty:
							return `(${filterObject.field} IS NULL)`;
					}
				})
				.join(' AND ');
			filterQuery = searchQuery ? ` AND (${filterConditions})` : ` WHERE (${filterConditions})`;
		}

		let orderQuery = '';
		if (settings.ordering_field && settings.ordering) {
			if (!availableFields.includes(settings.ordering_field)) {
				throw new Error(`Invalid ordering field: ${settings.ordering_field}`);
			}
			this.validateNamesAndThrowError([settings.ordering_field]);
			const orderDirection = settings.ordering.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
			orderQuery = ` ORDER BY ${settings.ordering_field} ${orderDirection}`;
		}
		const paginationQuery = ` OFFSET ${(page - 1) * perPage} ROWS FETCH NEXT ${perPage} ROWS ONLY`;

		const rowsQuery = `SELECT ${availableFields.join(
			',',
		)} FROM  ${connectionSchema}.${tableName}${searchQuery}${filterQuery}${orderQuery}${paginationQuery}`;

		const rows = await connectionToDb.query(rowsQuery, queryParams);

		rowsRO = {
			data: rows as Record<string, unknown>[],
			pagination: {
				total: rowsCount,
				lastPage: lastPage,
				perPage: perPage,
				currentPage: page,
			},
			large_dataset: large_dataset,
		};
		return rowsRO;
	}

	public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
		const cachedForeignKeys = LRUStorage.getTableForeignKeysCache(this.connection, tableName);
		if (cachedForeignKeys) {
			return cachedForeignKeys;
		}
		const connectionToDb = await this.getConnectionToDatabase();
		const query = `
    SELECT
    ref.constname AS constraint_name,
    col.colname AS column_name,
    pk.tabname AS referenced_table_name,
    pk.colname AS referenced_column_name
FROM
    syscat.references ref
        JOIN
    syscat.keycoluse col
    ON
        ref.constname = col.constname AND
        ref.tabschema = col.tabschema
        JOIN
    syscat.keycoluse pk
    ON
        ref.refkeyname = pk.constname AND
        ref.reftabschema = pk.tabschema AND
        col.colseq = pk.colseq
WHERE
    ref.tabname = ? AND
    ref.tabschema = ?
ORDER BY
    ref.constname, col.colseq
  `;
		const foreignKeys = await connectionToDb.query(query, [
			tableName.toUpperCase(),
			this.connection.schema.toUpperCase(),
		]);

		const resultKeys = (foreignKeys as unknown as IbmDb2Row[]).map((foreignKey) => {
			return {
				column_name: foreignKey.COLUMN_NAME,
				constraint_name: foreignKey.CONSTRAINT_NAME,
				referenced_table_name: foreignKey.REFERENCED_TABLE_NAME,
				referenced_column_name: foreignKey.REFERENCED_COLUMN_NAME,
			};
		});
		LRUStorage.setTableForeignKeysCache(this.connection, tableName, resultKeys);
		return resultKeys;
	}

	public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
		const cachedPrimaryColumns = LRUStorage.getTablePrimaryKeysCache(this.connection, tableName);
		if (cachedPrimaryColumns) {
			return cachedPrimaryColumns;
		}
		const connectionToDb = await this.getConnectionToDatabase();
		const query = `
    SELECT colname AS column_name, typename AS data_type
    FROM syscat.columns
    WHERE tabname = ?
      AND tabschema = ?
      AND keyseq IS NOT NULL
  `;
		const primaryKeys = await connectionToDb.query(query, [
			tableName.toUpperCase(),
			this.connection.schema.toUpperCase(),
		]);

		const resultKeys = (primaryKeys as unknown as IbmDb2Row[]).map((primaryKey) => {
			return {
				column_name: primaryKey.COLUMN_NAME,
				data_type: primaryKey.DATA_TYPE as string,
			};
		});
		LRUStorage.setTablePrimaryKeysCache(this.connection, tableName, resultKeys);
		return resultKeys;
	}

	public async getTablesFromDB(): Promise<TableDS[]> {
		const connectionToDb = await this.getConnectionToDatabase();
		const query = `
    SELECT tabname AS table_name, type AS table_type
    FROM syscat.tables
    WHERE tabschema = ?
    AND type IN ('T', 'V')
  `;
		const tables = await connectionToDb.query(query, [this.connection.schema.toUpperCase()]);

		return (tables as unknown as IbmDb2Row[]).map((table) => {
			return {
				tableName: table.TABLE_NAME,
				isView: table.TABLE_TYPE === 'V',
			};
		});
	}

	public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
		const connectionToDb = await this.getConnectionToDatabase();
		const query = `
    SELECT colname AS column_name,
    typename AS data_type,
    length AS character_maximum_length,
    scale AS numeric_scale,
    keyseq AS ordinal_position,
    nulls AS is_nullable,
    default AS column_default
    FROM syscat.columns
    WHERE tabname = ?
    AND tabschema = ?
    `;
		const tableStructure = await connectionToDb.query(query, [
			tableName.toUpperCase(),
			this.connection.schema.toUpperCase(),
		]);

		return (tableStructure as unknown as IbmDb2Row[]).map((column) => {
			return {
				allow_null: column.IS_NULLABLE === 'Y',
				column_default: column.COLUMN_DEFAULT,
				column_name: column.COLUMN_NAME,
				data_type: column.DATA_TYPE,
				character_maximum_length: column.CHARACTER_MAXIMUM_LENGTH,
				data_type_params: null,
				udt_name: null,
				extra: null,
			};
		});
	}

	public async testConnect(): Promise<TestConnectionResultDS> {
		if (!this.connection.id) {
			this.connection.id = nanoid(6);
		}
		const connectionToDb = await this.getConnectionToDatabase();
		const query = `
    SELECT 1 FROM sysibm.sysdummy1 
  `;
		try {
			const testResult = await connectionToDb.query(query);
			if (testResult?.[0] && testResult[0]['1'] === 1) {
				return {
					result: true,
					message: 'Successfully connected',
				};
			}
		} catch (error) {
			return {
				result: false,
				message: error.message,
			};
		} finally {
			LRUStorage.delImdbDb2Cache(this.connection);
		}
		return {
			result: false,
			message: 'Unknown error',
		};
	}

	public async updateRowInTable(
		tableName: string,
		row: Record<string, unknown>,
		primaryKey: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		this.validateNamesAndThrowError([
			tableName,
			this.connection.schema,
			...Object.keys(row),
			...Object.keys(primaryKey),
		]);
		const connectionToDb = await this.getConnectionToDatabase();

		const setClause = Object.keys(row)
			.map((key) => `${key} = ?`)
			.join(', ');
		const whereClause = Object.keys(primaryKey)
			.map((key) => `${key} = ?`)
			.join(' AND ');

		const query = `
      UPDATE ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
      SET ${setClause}
      WHERE ${whereClause}
    `;
		const params = [...Object.values(row), ...Object.values(primaryKey)] as SQLParam[];
		await connectionToDb.query(query, params);

		const selectQuery = `
      SELECT *
      FROM ${this.connection.schema.toUpperCase()}.${tableName.toUpperCase()}
      WHERE ${whereClause}
    `;
		const result = await connectionToDb.query(selectQuery, Object.values(primaryKey) as SQLParam[]);
		return result[0] as Record<string, unknown>;
	}

	public async bulkUpdateRowsInTable(
		tableName: string,
		newValues: Record<string, unknown>,
		primaryKeys: Array<Record<string, unknown>>,
	): Promise<Array<Record<string, unknown>>> {
		await Promise.allSettled(primaryKeys.map((key) => this.updateRowInTable(tableName, newValues, key)));
		return primaryKeys;
	}

	public async bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number> {
		await Promise.allSettled(primaryKeys.map((key) => this.deleteRowInTable(tableName, key)));
		return primaryKeys.length;
	}

	public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<string[]> {
		const [tableStructure, primaryColumns] = await Promise.all([
			this.getTableStructure(tableName),
			this.getTablePrimaryColumns(tableName),
		]);
		return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
	}

	public async getReferencedTableNamesAndColumns(tableName: string): Promise<ReferencedTableNamesAndColumnsDS[]> {
		const primaryColumns = await this.getTablePrimaryColumns(tableName);
		const connectionToDb = await this.getConnectionToDatabase();
		const results: Array<ReferencedTableNamesAndColumnsDS> = [];
		for (const primaryColumn of primaryColumns) {
			const query = `
      SELECT 
      ref.tabname AS referencing_table_name, 
      col.colname AS referencing_column_name
    FROM 
      syscat.references ref
    JOIN 
      syscat.keycoluse col 
    ON 
      ref.constname = col.constname AND 
      ref.tabschema = col.tabschema
    WHERE 
      ref.reftabname = ? AND 
      ref.reftabschema = ? AND 
      ref.refkeyname IN (
        SELECT constname 
        FROM syscat.keycoluse 
        WHERE tabschema = ? AND 
              tabname = ? AND 
              colname = ?
      )
      `;
			const foreignKeys = await connectionToDb.query(query, [
				tableName.toUpperCase(),
				this.connection.schema.toUpperCase(),
				this.connection.schema.toUpperCase(),
				tableName.toUpperCase(),
				primaryColumn.column_name.toUpperCase(),
			]);
			results.push({
				referenced_on_column_name: primaryColumn.column_name,
				referenced_by: (foreignKeys as unknown as IbmDb2Row[]).map((foreignKey) => {
					return {
						table_name: foreignKey.REFERENCING_TABLE_NAME,
						column_name: foreignKey.REFERENCING_COLUMN_NAME,
					};
				}),
			});
		}
		return results;
	}

	public async isView(tableName: string): Promise<boolean> {
		const connectionToDb = await this.getConnectionToDatabase();
		const query = `
    SELECT TYPE AS table_type
    FROM SYSCAT.TABLES
    WHERE TABSCHEMA = ? AND TABNAME = ?
    `;
		const tableData = await connectionToDb.query(query, [
			this.connection.schema.toUpperCase(),
			tableName.toUpperCase(),
		]);
		return (tableData[0] as unknown as IbmDb2Row).TABLE_TYPE === 'V';
	}

	public async getTableRowsStream(
		tableName: string,
		settings: TableSettingsDS,
		page: number,
		perPage: number,
		searchedFieldValue: string,
		filteringFields: FilteringFieldsDS[],
	): Promise<Stream & AsyncIterable<Record<string, unknown>>> {
		const { large_dataset } = await this.getRowsCount(tableName, this.connection.schema);
		if (large_dataset) {
			throw new Error(ERROR_MESSAGES.DATA_IS_TO_LARGE);
		}
		const rowsResult = await this.getRowsFromTable(
			tableName,
			settings,
			page,
			perPage,
			searchedFieldValue,
			filteringFields,
			null,
			null,
		);
		return rowsResult.data as unknown as Stream & AsyncIterable<Record<string, unknown>>;
	}

	public async getRowsCount(
		tableName: string,
		tableSchema: string,
	): Promise<{ rowsCount: number; large_dataset: boolean }> {
		const connectionToDb = await this.getConnectionToDatabase();
		const fastCount = await this.getFastRowsCount(tableName, tableSchema);
		if (fastCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT) {
			return { rowsCount: fastCount, large_dataset: true };
		}
		const countQuery = `
    SELECT COUNT(*) 
    FROM ${tableSchema}.${tableName}
  `;
		const countResult = await connectionToDb.query(countQuery);
		const rowsCount = parseInt(countResult[0]['1'], 10);
		return { rowsCount: rowsCount, large_dataset: false };
	}

	public async getFastRowsCount(tableName: string, tableSchema: string): Promise<number> {
		const connectionToDb = await this.getConnectionToDatabase();
		const fastCountQuery = `
    SELECT CARD 
    FROM SYSIBM.SYSTABLES 
    WHERE NAME = ? 
    AND CREATOR = ?
  `;
		const fastCountParams = [tableName, tableSchema];
		const fastCountQueryResult = await connectionToDb.query(fastCountQuery, fastCountParams);
		const fastCount = (fastCountQueryResult[0] as Record<string, number>).CARD;
		return fastCount;
	}

	public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
		const stream = new Readable();
		stream.push(file.buffer);
		stream.push(null);

		const parser = stream.pipe(csv.parse({ columns: true }));
		const results: Record<string, unknown>[] = [];
		for await (const record of parser) {
			results.push(record as Record<string, unknown>);
		}
		await Promise.allSettled(
			results.map(async (row) => {
				return await this.addRowInTable(tableName, row);
			}),
		);
	}

	public async executeRawQuery(query: string): Promise<Array<Record<string, unknown>>> {
		const connectionToDb = await this.getConnectionToDatabase();
		const result = await connectionToDb.query(query);
		return result as Record<string, unknown>[];
	}

	public async getSchemaHash(): Promise<string> {
		const cachedHash = LRUStorage.getSchemaHashCache(this.connection);
		if (cachedHash) {
			return cachedHash;
		}

		const connectionToDb = await this.getConnectionToDatabase();
		const schema = this.connection.schema?.toUpperCase() ?? this.connection.username.toUpperCase();

		const query = `
			SELECT 
				COALESCE(table_count, 0) || '|' || 
				COALESCE(column_count, 0) || '|' || 
				COALESCE(index_count, 0) || '|' ||
				COALESCE(column_checksum, 0) AS SCHEMA_HASH
			FROM (
				SELECT 
					(SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABSCHEMA = '${schema}' AND TYPE = 'T') AS table_count,
					(SELECT COUNT(*) FROM SYSCAT.COLUMNS WHERE TABSCHEMA = '${schema}') AS column_count,
					(SELECT COUNT(*) FROM SYSCAT.INDEXES WHERE TABSCHEMA = '${schema}') AS index_count,
					(SELECT COALESCE(SUM(COLNO + LENGTH(COLNAME) + LENGTH(TYPENAME)), 0) 
					 FROM SYSCAT.COLUMNS WHERE TABSCHEMA = '${schema}') AS column_checksum
				FROM SYSIBM.SYSDUMMY1
			)
		`;

		const result = await connectionToDb.query(query);
		const hash = (result as Array<Record<string, unknown>>)?.[0]?.SCHEMA_HASH || '';

		LRUStorage.validateSchemaHashAndInvalidate(this.connection, hash as string);

		return hash as string;
	}

	private getConnectionToDatabase(): Promise<Database> {
		if (this.connection.ssh) {
			return this.createTunneledConnection(this.connection);
		}
		return this.getUsualConnection();
	}

	private async getUsualConnection(withCache = true): Promise<Database> {
		const cachedDatabase = LRUStorage.getImdbDb2Cache(this.connection);
		if (withCache && cachedDatabase && cachedDatabase.connected) {
			return cachedDatabase;
		}
		let connStr = `DATABASE=${this.connection.database};HOSTNAME=${this.connection.host};UID=${this.connection.username};PWD=${this.connection.password};PORT=${this.connection.port};PROTOCOL=TCPIP`;
		if (this.connection.ssl) {
			connStr += ';SECURITY=SSL';
			if (this.connection.cert) {
				connStr += `;SSLServerCertificate=${this.connection.cert}`;
			}
		}
		const connectionPool = new Pool();
		const databaseConnection = await connectionPool.open(connStr);
		LRUStorage.setImdbDb2Cache(this.connection, databaseConnection);
		return databaseConnection;
	}

	private createTunneledConnection(connection: ConnectionParams): Promise<Database> {
		const connectionCopy = { ...connection };
		return new Promise<Database>(async (resolve, reject) => {
			const cachedTnl = LRUStorage.getTunnelCache(connectionCopy);
			if (cachedTnl?.database && cachedTnl.server && cachedTnl.client && cachedTnl.database.connected) {
				resolve(cachedTnl.database);
				return;
			}
			const freePort = await getPort();
			try {
				const [server, client] = await getTunnel(connectionCopy, freePort);
				connection.host = '127.0.0.1';
				connection.port = freePort;
				const database = await this.getUsualConnection(false);
				const tnlCachedObj = {
					server: server,
					client: client,
					database: database,
				};
				LRUStorage.setTunnelCache(connectionCopy, tnlCachedObj);
				resolve(tnlCachedObj.database);

				client.on('error', (e) => {
					LRUStorage.delTunnelCache(connectionCopy);
					reject(e);
					return;
				});

				server.on('error', (e) => {
					LRUStorage.delTunnelCache(connectionCopy);
					reject(e);
					return;
				});
				return;
			} catch (error) {
				LRUStorage.delTunnelCache(connectionCopy);
				reject(error);
				return;
			}
		});
	}
}
