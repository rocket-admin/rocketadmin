import { Stream } from 'stream';
import { AutocompleteFieldsDS } from '../shared/data-structures/autocomplete-fields.ds.js';
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
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { DynamoDB, PutItemCommandInput, ScanCommand } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import * as csv from 'csv';
import { QueryOrderingEnum } from '../shared/enums/query-ordering.enum.js';

export class DataAccessObjectDynamoDB extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    const dynamoDb = this.getDynamoDb();
    const params: PutItemCommandInput = {
      TableName: tableName,
      Item: row as any,
      ReturnValues: 'ALL_OLD',
    };
    const insertResult = await dynamoDb.putItem(params);
    const insertedData = insertResult.Attributes;
    return insertedData;
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const dynamoDb = this.getDynamoDb();
    const params = {
      TableName: tableName,
      Key: primaryKey as any,
      returnValues: 'ALL_OLD',
    };
    const deleteResult = await dynamoDb.deleteItem(params);
    const deletedData = deleteResult.Attributes;
    return deletedData;
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>> {
    return [];
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    let availableFields: string[] = [];
    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    const dynamoDb = this.getDynamoDb();
    const params = {
      TableName: tableName,
      Key: primaryKey as any,
    };
    const result = await dynamoDb.getItem(params);
    const foundRow = result.Item;
    if (!foundRow) {
      return null;
    }
    const rowKeys = Object.keys(foundRow);
    if (availableFields.length > 0) {
      for (const key of rowKeys) {
        if (!availableFields.includes(key)) {
          delete foundRow[key];
        }
      }
    }
    return foundRow;
  }

  public async getRowsFromTable(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: FilteringFieldsDS[],
    autocompleteFields: AutocompleteFieldsDS,
  ): Promise<FoundRowsDS> {
    const dynamoDB = this.getDynamoDb();

    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvailableFields(settings, tableStructure);

    let filterExpression = '';
    let expressionAttributeValues: { [key: string]: any } = {};
    let expressionAttributeNames: { [key: string]: string } = {};

    if (autocompleteFields?.value && autocompleteFields.fields?.length > 0) {
      const { fields, value } = autocompleteFields;
      filterExpression = fields.map((field) => `#${field} = :value`).join(' OR ');
      expressionAttributeValues = { ':value': { S: value } };
      fields.forEach((field) => {
        expressionAttributeNames[`#${field}`] = field;
      });

      const params = {
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        Limit: DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT,
      };

      const result = await dynamoDB.scan(params);
      const rows = result.Items;
      const large_dataset = rows.length >= DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT;

      return {
        data: rows.map((row) => this.transformAndFilterRow(row, availableFields)),
        large_dataset,
        pagination: {} as any,
      };
    }

    if (searchedFieldValue && settings.search_fields?.length > 0) {
      const searchFields = settings.search_fields.length > 0 ? settings.search_fields : availableFields;
      filterExpression = searchFields.map((field) => `begins_with(#${field}, :searchedFieldValue)`).join(' OR ');
      expressionAttributeValues = { ':searchedFieldValue': { S: searchedFieldValue } };
      searchFields.forEach((field) => {
        expressionAttributeNames[`#${field}`] = field;
      });
    }

    if (filteringFields?.length > 0) {
      filteringFields.forEach((filter) => {
        const { field, criteria, value } = filter;
        expressionAttributeNames[`#${field}`] = field;
        switch (criteria) {
          case FilterCriteriaEnum.eq:
            filterExpression += ` AND #${field} = :${field}`;
            expressionAttributeValues[`:${field}`] = { S: value };
            break;
          case FilterCriteriaEnum.contains:
            filterExpression += ` AND contains(#${field}, :${field})`;
            expressionAttributeValues[`:${field}`] = { S: value };
            break;
          case FilterCriteriaEnum.gt:
            filterExpression += ` AND #${field} > :${field}`;
            expressionAttributeValues[`:${field}`] = { N: value };
            break;
          case FilterCriteriaEnum.lt:
            filterExpression += ` AND #${field} < :${field}`;
            expressionAttributeValues[`:${field}`] = { N: value };
            break;
          case FilterCriteriaEnum.gte:
            filterExpression += ` AND #${field} >= :${field}`;
            expressionAttributeValues[`:${field}`] = { N: value };
            break;
          case FilterCriteriaEnum.lte:
            filterExpression += ` AND #${field} <= :${field}`;
            expressionAttributeValues[`:${field}`] = { N: value };
            break;
          case FilterCriteriaEnum.icontains:
            filterExpression += ` AND NOT contains(#${field}, :${field})`;
            expressionAttributeValues[`:${field}`] = { S: value };
            break;
          case FilterCriteriaEnum.startswith:
            filterExpression += ` AND begins_with(#${field}, :${field})`;
            expressionAttributeValues[`:${field}`] = { S: value };
            break;
          case FilterCriteriaEnum.endswith:
            filterExpression += ` AND ends_with(#${field}, :${field})`;
            expressionAttributeValues[`:${field}`] = { S: value };
            break;
          case FilterCriteriaEnum.empty:
            filterExpression += ` AND attribute_not_exists(#${field})`;
            break;
          default:
            break;
        }
      });
    }

    const totalRowsCount = await this.countTotalRows(
      tableName,
      filterExpression,
      expressionAttributeValues,
      expressionAttributeNames,
    );

    let lastEvaluatedKey = null;
    let rows = [];
    let rowsCount = 0;

    do {
      const params: any = {
        TableName: tableName,
        Limit: perPage,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
      }

      if (Object.keys(expressionAttributeValues).length) {
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      if (Object.keys(expressionAttributeNames).length) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      const result = await dynamoDB.scan(params);

      rows = rows.concat(result.Items);
      rowsCount += result.Count;
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    if (settings.ordering_field && settings.ordering) {
      rows = this.sortRows(rows, settings.ordering_field, settings.ordering);
    }

    const itemsToSkip = (page - 1) * perPage;
    rows = rows.slice(itemsToSkip, itemsToSkip + perPage);

    const large_dataset = totalRowsCount >= DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT;

    const pagination = {
      total: totalRowsCount,
      lastPage: Math.ceil(totalRowsCount / perPage),
      perPage: perPage,
      currentPage: page,
    };

    return {
      data: rows.map((row) => this.transformAndFilterRow(row, availableFields)),
      pagination,
      large_dataset,
    };
  }

  public async getTableForeignKeys(tableName: string): Promise<Array<ForeignKeyDS>> {
    return [];
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>> {
    const dynamoDB = this.getDynamoDb();
    const params = {
      TableName: tableName,
    };
    const tableDescription = await dynamoDB.describeTable(params);
    const keySchema = tableDescription.Table.KeySchema;
    const primaryKeys = keySchema.map((key) => {
      return {
        column_name: key.AttributeName,
        data_type: this.convertTypeName(key.KeyType),
      };
    });
    return primaryKeys;
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    const dynamoDb = this.getDynamoDb();
    const result = await dynamoDb.listTables();
    const tableNames = result.TableNames;
    const tables = tableNames.map((tableName) => {
      return {
        tableName: tableName,
        isView: false,
      };
    });
    return tables;
  }

  public async getTableStructure(tableName: string): Promise<Array<TableStructureDS>> {
    try {
      const dynamoDb = this.getDynamoDb();
      const documentClient = DynamoDBDocumentClient.from(dynamoDb);

      const params = {
        TableName: tableName,
        Limit: 100,
      };

      const scanResult = await documentClient.send(new ScanCommand(params));
      const items = scanResult.Items || [];

      const attributeTypes: { [key: string]: string } = {};

      items.forEach((item) => {
        Object.keys(item).forEach((key) => {
          if (!attributeTypes[key]) {
            attributeTypes[key] = typeof item[key];
          }
        });
      });

      const tableStructure = Object.keys(attributeTypes).map((attributeName) => {
        return {
          allow_null: true,
          character_maximum_length: null,
          column_default: null,
          column_name: attributeName,
          data_type: this.convertTypeName(attributeTypes[attributeName]),
          data_type_params: null,
          udt_name: null,
          extra: null,
        };
      });

      return tableStructure;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const dynamoDb = this.getDynamoDb();
    try {
      await dynamoDb.listTables();
      return {
        result: true,
        message: 'Successfully connected',
      };
    } catch (error) {
      return {
        result: false,
        message: error.message,
      };
    }
  }

  public async updateRowInTable(
    tableName: string,
    row: Record<string, unknown>,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const dynamoDb = this.getDynamoDb();
    const params = {
      TableName: tableName,
      Key: primaryKey,
      Item: row as any,
      returnValues: 'ALL_OLD',
    };
    const updateResult = await dynamoDb.putItem(params);
    const updatedData = updateResult.Attributes;
    return primaryKey;
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const dynamoDb = this.getDynamoDb();
    const updatePromises = primaryKeys.map((primaryKey) => {
      const params = {
        TableName: tableName,
        Key: primaryKey,
        Item: newValues as any,
        returnValues: 'ALL_OLD',
      };
      return dynamoDb.putItem(params);
    });
    const updatedData = await Promise.all(updatePromises);
    return primaryKeys as any;
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<Array<string>> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<Array<ReferencedTableNamesAndColumnsDS>> {
    return [];
  }

  public async isView(tableName: string): Promise<boolean> {
    return false;
  }

  public async getTableRowsStream(
    tableName: string,
    settings: TableSettingsDS,
    page: number,
    perPage: number,
    searchedFieldValue: string,
    filteringFields: Array<FilteringFieldsDS>,
  ): Promise<Stream & AsyncIterable<any>> {
    const result = await this.getRowsFromTable(
      tableName,
      settings,
      page,
      perPage,
      searchedFieldValue,
      filteringFields,
      null,
    );
    return result.data as any;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const dynamoDbClient = this.getDynamoDb();
    const documentClient = DynamoDBDocumentClient.from(dynamoDbClient);
    const fileStream = new Stream.PassThrough();
    fileStream.end(file.buffer);

    const items: any[] = [];

    return new Promise((resolve, reject) => {
      fileStream
        .pipe(csv.parse({ columns: true }))
        .on('data', (data) => {
          items.push({
            PutRequest: {
              Item: data,
            },
          });

          // If the items array reaches 25, write the batch and reset the array
          if (items.length === 25) {
            const params = {
              RequestItems: {
                [tableName]: items,
              },
            };
            documentClient
              .send(new BatchWriteCommand(params))
              .then(() => {
                items.length = 0; // Clear the array
              })
              .catch((err) => {
                reject(err);
              });
          }
        })
        .on('end', async () => {
          // Write any remaining items
          if (items.length > 0) {
            const params = {
              RequestItems: {
                [tableName]: items,
              },
            };
            try {
              await documentClient.send(new BatchWriteCommand(params));
              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            resolve();
          }
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  private getDynamoDb(): DynamoDB {
    const endpoint = this.connection.host;
    const accessKeyId = this.connection.username;
    const secretAccessKey = this.connection.password;
    const dynamoDb = new DynamoDB({
      endpoint: endpoint,
      region: process.env.NODE_ENV === 'test' ? 'localhost' : undefined,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    return dynamoDb;
  }

  private convertTypeName(dynamoDbType: string): string {
    switch (dynamoDbType) {
      case 'S':
        return 'string';
      case 'N':
        return 'number';
      case 'B':
        return 'binary';
      case 'HASH':
        return 'string';
      default:
        return 'string';
    }
  }

  private transformAndFilterRow(
    row: { [key: string]: { [type: string]: any } },
    availableFields: string[],
  ): { [key: string]: any } {
    const transformedRow: { [key: string]: any } = {};

    Object.keys(row).forEach((key) => {
      const attribute = row[key];
      const attributeType = Object.keys(attribute)[0];
      transformedRow[key] = attribute[attributeType];
    });

    Object.keys(transformedRow).forEach((key) => {
      if (!availableFields.includes(key)) {
        delete transformedRow[key];
      }
    });

    return transformedRow;
  }

  private async countTotalRows(
    tableName: string,
    filterExpression: string,
    expressionAttributeValues: { [key: string]: any },
    expressionAttributeNames: { [key: string]: string },
  ): Promise<number> {
    try {
      let lastEvaluatedKey = null;
      let totalRowsCount = 0;
      const dynamoDB = this.getDynamoDb();
      do {
        const params: any = {
          TableName: tableName,
          ExclusiveStartKey: lastEvaluatedKey,
        };

        if (filterExpression) {
          params.FilterExpression = filterExpression;
        }

        if (filterExpression && Object.keys(expressionAttributeValues).length) {
          params.ExpressionAttributeValues = expressionAttributeValues;
        }

        if (filterExpression && Object.keys(expressionAttributeNames).length) {
          params.ExpressionAttributeNames = expressionAttributeNames;
        }

        const result = await dynamoDB.scan(params);
        totalRowsCount += result.Count;
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      return totalRowsCount;
    } catch (error) {
      throw error;
    }
  }

  private sortRows(rows: any[], orderingField: string, ordering: QueryOrderingEnum): any[] {
    return rows.sort((a, b) => {
      const aValue = a[orderingField]?.S || a[orderingField]?.N || '';
      const bValue = b[orderingField]?.S || b[orderingField]?.N || '';

      if (ordering === QueryOrderingEnum.ASC) {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }
}
