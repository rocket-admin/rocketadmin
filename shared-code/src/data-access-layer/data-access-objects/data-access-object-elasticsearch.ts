import { Client } from '@elastic/elasticsearch';
import { MgetResponse } from '@elastic/elasticsearch/lib/api/types.js';
import * as csv from 'csv';
import { Readable, Stream } from 'stream';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { FilteringFieldsDS } from '../shared/data-structures/filtering-fields.ds.js';
import { ForeignKeyDS } from '../shared/data-structures/foreign-key.ds.js';
import { FoundRowsDS } from '../shared/data-structures/found-rows.ds.js';
import { PrimaryKeyDS } from '../shared/data-structures/primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDS } from '../shared/data-structures/referenced-table-names-columns.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';

export class DataAccessObjectElasticsearch extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    const client = this.getElasticClient();
    const response = await client.index({
      index: tableName,
      document: row,
    });
    await client.indices.refresh({ index: tableName });
    return { _id: response._id, ...row };
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const client = this.getElasticClient();
    const response = await client.delete({
      index: tableName,
      id: primaryKey._id as string,
    });
    if (response.result !== 'deleted') {
      throw new Error('Document was not deleted successfully');
    }
    await client.indices.refresh({ index: tableName });
    return { _id: primaryKey._id };
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>> {
    const client = this.getElasticClient();
    const query = {
      index: tableName,
      body: {
        query: {
          terms: {
            [referencedFieldName]: fieldValues,
          },
        },
        _source: {
          includes: identityColumnName ? [referencedFieldName, identityColumnName] : [referencedFieldName],
        },
      },
    } as const;

    const response = await client.search(query as any);

    return response.hits.hits.map((hit) => {
      const source = hit._source as Record<string, unknown>;
      return {
        ...source,
        _id: hit._id,
      };
    });
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const primaryKeyValue = primaryKey._id;
    const client = this.getElasticClient();
    let responseObject = {} as Record<string, unknown>;
    try {
      const response = await client.get({
        index: tableName,
        id: primaryKeyValue as string,
      });
      responseObject = {
        ...(response._source as Record<string, unknown>),
        _id: response._id,
      };
    } catch (error) {
      if (error.meta?.body?.found === false) {
        return null;
      }
      throw error;
    }

    let availableFields: string[] = [];
    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    if (availableFields.length > 0) {
      Object.keys(responseObject).forEach((key) => {
        if (!availableFields.includes(key)) {
          // eslint-disable-next-line security/detect-object-injection
          delete responseObject[key];
        }
      });
    }

    return responseObject;
  }

  public async bulkGetRowsFromTableByPrimaryKeys(
    tableName: string,
    primaryKeys: Array<Record<string, unknown>>,
    settings: TableSettingsDS,
  ): Promise<Array<Record<string, unknown>>> {
    const client = this.getElasticClient();

    const primaryDocs = primaryKeys.map((primaryKey) => ({
      _id: primaryKey['_id'] as string,
    }));
    const response = (await client.mget({
      index: tableName,
      ids: primaryDocs.map((doc) => doc._id),
    })) as MgetResponse<Record<string, unknown>>;

    let availableFields: string[] = [];
    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    return response.docs
      .map((doc) => {
        if ('error' in doc) {
          return null;
        }
        const responseObject = {
          ...(doc._source as Record<string, unknown>),
          _id: doc._id,
        };
        if (availableFields.length > 0) {
          Object.keys(responseObject).forEach((key) => {
            if (!availableFields.includes(key)) {
              // eslint-disable-next-line security/detect-object-injection
              delete responseObject[key];
            }
          });
        }
        return responseObject;
      })
      .filter((doc) => doc !== null);
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
    autocompleteFields: AutocompleteFieldsDS,
    tableStructure: TableStructureDS[] | null,
  ): Promise<FoundRowsDS> {
    const client = this.getElasticClient();

    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;

    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const from = (page - 1) * perPage;
    const searchQuery: any = {
      index: tableName,
      from,
      size: perPage,
      query: {
        bool: {
          must: [],
          must_not: [],
        },
      },
    };

    if (autocompleteFields?.value && autocompleteFields.fields?.length > 0) {
      const { fields, value } = autocompleteFields;
      searchQuery.query.bool.must.push({
        multi_match: {
          query: value as string,
          fields: fields,
          type: 'phrase_prefix',
        },
      });
      searchQuery.size = DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT;
    }

    if (!tableStructure) {
      tableStructure = await this.getTableStructure(tableName);
    }

    let { search_fields } = settings;
    if ((!search_fields || search_fields.length === 0) && searchedFieldValue) {
      search_fields = tableStructure.map((field) => field.column_name);
    }

    if (searchedFieldValue && search_fields?.length > 0) {
      const textFields = tableStructure
        .filter((field) => field.data_type === 'string')
        .map((field) => field.column_name);

      const validSearchFields = search_fields.filter((field) => textFields.includes(field));

      if (validSearchFields.length) {
        searchQuery.query.bool.must.push({
          multi_match: {
            query: searchedFieldValue,
            fields: validSearchFields,
            type: 'phrase_prefix',
          },
        });
      }
    }

    if (filteringFields?.length > 0) {
      for (const filter of filteringFields) {
        const { field, criteria, value } = filter;

        switch (criteria) {
          case FilterCriteriaEnum.eq:
            searchQuery.query.bool.must.push({ term: { [field]: value } });
            break;
          case FilterCriteriaEnum.contains:
            searchQuery.query.bool.must.push({
              wildcard: { [field]: `*${value}*` },
            });
            break;
          case FilterCriteriaEnum.gt:
            searchQuery.query.bool.must.push({ range: { [field]: { gt: value } } });
            break;
          case FilterCriteriaEnum.lt:
            searchQuery.query.bool.must.push({ range: { [field]: { lt: value } } });
            break;
          case FilterCriteriaEnum.gte:
            searchQuery.query.bool.must.push({ range: { [field]: { gte: value } } });
            break;
          case FilterCriteriaEnum.lte:
            searchQuery.query.bool.must.push({ range: { [field]: { lte: value } } });
            break;
          case FilterCriteriaEnum.icontains:
            searchQuery.query.bool.must_not.push({
              wildcard: { [field]: `*${value}*` },
            });
            break;
          case FilterCriteriaEnum.startswith:
            searchQuery.query.bool.must.push({
              prefix: { [field]: value as string },
            });
            break;
          case FilterCriteriaEnum.endswith:
            searchQuery.query.bool.must.push({
              wildcard: { [field]: `*${value}` },
            });
            break;
          case FilterCriteriaEnum.empty:
            searchQuery.query.bool.must_not.push({
              exists: { field },
            });
            break;
        }
      }
    }

    if (
      !autocompleteFields?.value &&
      (!searchedFieldValue || search_fields?.length === 0) &&
      (!filteringFields || filteringFields.length === 0)
    ) {
      searchQuery.query = { match_all: {} };
    }

    if (settings.ordering_field && settings.ordering) {
      searchQuery.sort = [{ [settings.ordering_field]: settings.ordering.toLowerCase() }];
    }

    const response = await client.search(searchQuery);

    const total = response.hits.total as { value: number };

    const rows = response.hits.hits.map((hit) => ({
      ...(hit._source as Record<string, unknown>),
      _id: hit._id,
    }));

    let availableFields: string[] = [];
    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    if (availableFields.length > 0) {
      rows.forEach((row) => {
        Object.keys(row).forEach((key) => {
          if (!availableFields.includes(key) && key !== '_id') {
            // eslint-disable-next-line security/detect-object-injection
            delete row[key];
          }
        });
      });
    }

    return {
      data: rows,
      pagination: {
        total: total.value,
        lastPage: Math.ceil(total.value / perPage),
        perPage,
        currentPage: page,
      },
      large_dataset: total.value > DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT,
    };
  }

  public async getTableForeignKeys(_tableName: string): Promise<Array<ForeignKeyDS>> {
    return [];
  }

  public async getTablePrimaryColumns(_tableName: string): Promise<Array<PrimaryKeyDS>> {
    return [
      {
        column_name: '_id',
        data_type: 'string',
      },
    ];
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    const client = this.getElasticClient();
    const response = await client.cat.indices({
      format: 'json',
    });
    return response.map((index) => ({
      tableName: index.index,
      isView: false,
    }));
  }

  public async getTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    const client = this.getElasticClient();

    const mappingResponse = await client.indices.getMapping({
      index: tableName,
    });

    const indexName = Object.keys(mappingResponse)[0];
    // eslint-disable-next-line security/detect-object-injection
    const properties = mappingResponse[indexName]?.mappings?.properties || {};

    const structure: TableStructureDS[] = [
      {
        column_name: '_id',
        data_type: 'string',
        allow_null: false,
        character_maximum_length: null,
        column_default: null,
        data_type_params: null,
        udt_name: null,
        extra: null,
      },
    ];

    for (const [fieldName, fieldMapping] of Object.entries(properties)) {
      const field = fieldMapping as any;

      structure.push({
        column_name: fieldName,
        data_type: this.mapElasticsearchType(field.type || 'object'),
        allow_null: true,
        character_maximum_length: null,
        column_default: null,
        data_type_params: null,
        udt_name: null,
        extra: null,
      });
    }

    const searchResponse = await client.search({
      index: tableName,
      size: 100,
      query: { match_all: {} },
    });

    const documents = searchResponse.hits.hits.map((hit) => hit._source);

    const fieldSet = new Set<string>();
    documents.forEach((doc) => {
      if (doc) {
        Object.keys(doc).forEach((key) => fieldSet.add(key));
      }
    });

    fieldSet.forEach((fieldName) => {
      if (!structure.some((field) => field.column_name === fieldName)) {
        // eslint-disable-next-line security/detect-object-injection
        const sampleValue = documents.find((doc) => doc && doc[fieldName] !== undefined)?.[fieldName];
        structure.push({
          column_name: fieldName,
          data_type: this.inferFieldType(sampleValue),
          allow_null: sampleValue === null || sampleValue === undefined,
          character_maximum_length: null,
          column_default: null,
          data_type_params: null,
          udt_name: null,
          extra: null,
        });
      }
    });

    return structure;
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const client = this.getElasticClient();

    try {
      const _response = await client.cluster.health({
        timeout: '5s',
      });

      return {
        result: true,
        message: `Successfully connected`,
      };
    } catch (error) {
      return {
        result: false,
        message: error.message || 'Connection failed',
      };
    } finally {
      await client.close();
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const client = this.getElasticClient();
    const primaryKeyValue = primaryKey._id as string;
    delete row._id;
    try {
      await client.update({
        index: tableName,
        id: primaryKeyValue,
        doc: row,
      });
      await client.indices.refresh({ index: tableName });
      return { _id: primaryKeyValue, ...row };
    } catch (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    if (primaryKeys.length === 0) {
      return [];
    }

    const client = this.getElasticClient();

    const body = primaryKeys.flatMap((primaryKey) => {
      const documentId = primaryKey._id as string;
      const updateQuery = { ...newValues };
      delete updateQuery._id;
      return [{ update: { _index: tableName, _id: documentId } }, { doc: updateQuery }];
    });

    const response = await client.bulk({ refresh: true, body });
    const erroredDocuments = response.items.filter((item) => item.update.error);
    if (erroredDocuments.length > 0) {
      throw new Error(`Failed to update some documents: ${erroredDocuments.map((doc) => doc.update.error).join(', ')}`);
    }
    await client.indices.refresh({ index: tableName });
    return primaryKeys.map((primaryKey) => ({ _id: primaryKey._id }));
  }

  public async bulkDeleteRowsInTable(tableName: string, primaryKeys: Array<Record<string, unknown>>): Promise<number> {
    if (primaryKeys.length === 0) {
      return 0;
    }

    const client = this.getElasticClient();

    const body = primaryKeys.map((primaryKey) => {
      const documentId = primaryKey._id as string;
      return { delete: { _index: tableName, _id: documentId } };
    });

    const response = await client.bulk({ refresh: true, body });
    const successfulDeletes = response.items.filter((item) => !item.delete.error).length;

    const erroredDeletes = response.items.filter((item) => item.delete.error);
    if (erroredDeletes.length > 0) {
      throw new Error(`Failed to delete some documents: ${erroredDeletes.map((doc) => doc.delete.error).join(', ')}`);
    }
    await client.indices.refresh({ index: tableName });
    return successfulDeletes;
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  public async getReferencedTableNamesAndColumns(_tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>> {
    return [];
  }

  public async isView(_tableName: string): Promise<boolean> {
    return false;
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: FilteringFieldsDS[],
  ): Promise<Stream & AsyncIterable<any>> {
    const result = await this.getRowsFromTable(
      tableName,
      settings,
      page,
      perPage,
      searchedFieldValue,
      filteringFields,
      null,
      null,
    );
    return result.data as any;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const client = this.getElasticClient();
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);

    const parser = stream.pipe(csv.parse({ columns: true }));

    const actions = [];
    for await (const record of parser) {
      actions.push({ index: { _index: tableName } });
      actions.push(record);
    }

    if (actions.length > 0) {
      try {
        const response = await client.bulk({ refresh: true, body: actions });
        const erroredDocuments = response.items.filter((item) => item.index && item.index.error);
        if (erroredDocuments.length > 0) {
          throw new Error(
            `Failed to index some documents: ${erroredDocuments.map((doc) => doc.index.error).join(', ')}`,
          );
        }
      } catch (error) {
        throw new Error(`CSV import failed: ${error.message}`);
      }
    }
  }

  public async executeRawQuery(query: string, tableName: string): Promise<Array<Record<string, unknown>>> {
    const client = this.getElasticClient();

    const parsedQuery = JSON.parse(query);
    const response = await client.search({
      index: tableName,
      body: parsedQuery,
    });

    return response.hits.hits.map((hit) => ({
      ...(hit._source as Record<string, unknown>),
      _id: hit._id,
    }));
  }

  private getElasticClient(): Client {
    const { host, port, username, password, ssl, cert } = this.connection;
    const protocol = ssl ? 'https' : 'http';
    const node = `${protocol}://${host}:${port}`;
    const options: any = {
      node,
      auth: {
        username,
        password,
      },
    };
    if (ssl) {
      options.tls = {
        rejectUnauthorized: !cert,
      };

      if (cert) {
        options.tls.ca = cert;
      }
    }
    return new Client(options);
  }

  private mapElasticsearchType(esType: string): string {
    const typeMapping: { [key: string]: string } = {
      text: 'string',
      keyword: 'string',
      long: 'number',
      integer: 'number',
      short: 'number',
      byte: 'number',
      double: 'number',
      float: 'number',
      half_float: 'number',
      scaled_float: 'number',
      boolean: 'boolean',
      date: 'date',
      object: 'object',
      nested: 'array',
      array: 'array',
      binary: 'binary',
      range: 'range',
      ip: 'string',
      version: 'string',
      murmur3: 'string',
      geo_point: 'geo_point',
      geo_shape: 'geo_shape',
      completion: 'string',
      token_count: 'number',
      dense_vector: 'array',
      rank_feature: 'number',
      rank_features: 'object',
    };

    // eslint-disable-next-line security/detect-object-injection
    return typeMapping[esType] || 'string';
  }

  private inferFieldType(value: any): string {
    if (typeof value === 'string') {
      return 'string';
    } else if (typeof value === 'number') {
      return 'number';
    } else if (value instanceof Date || !isNaN(Date.parse(value))) {
      return 'date';
    } else if (typeof value === 'boolean') {
      return 'boolean';
    } else if (Array.isArray(value)) {
      return 'array';
    } else if (typeof value === 'object') {
      return 'object';
    }
    return 'unknown';
  }
}
