/* eslint-disable security/detect-object-injection */
import {
  DeleteItemCommand,
  DynamoDB,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import * as csv from 'csv';
import { Stream } from 'stream';
import { binaryToHex, hexToBinary } from '../../helpers/binary-hex-string-convertion.js';
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
import { DynamoDBType, TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TableDS } from '../shared/data-structures/table.ds.js';
import { TestConnectionResultDS } from '../shared/data-structures/test-result-connection.ds.js';
import { ValidateTableSettingsDS } from '../shared/data-structures/validate-table-settings.ds.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { QueryOrderingEnum } from '../shared/enums/query-ordering.enum.js';
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';

export type DdAndClient = {
  dynamoDb: DynamoDB;
  documentClient: DynamoDBDocumentClient;
};
export class DataAccessObjectDynamoDB extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<Record<string, unknown> | number> {
    try {
      const tableStructure = await this.getTableStructure(tableName);
      row = this.convertHexDataToBinaryInBinarySets(row, tableStructure);
      const { documentClient } = this.getDynamoDb();
      const params = {
        TableName: tableName,
        Item: marshall(row),
        ReturnValues: 'ALL_OLD' as const,
      };
      await documentClient.send(new PutItemCommand(params));
      const primaryKey = await this.getTablePrimaryColumns(tableName);
      const responseObject = {};
      primaryKey.forEach((key) => {
        responseObject[key.column_name] = row[key.column_name];
      });
      return responseObject;
    } catch (e) {
      e.message += '.';
      throw e;
    }
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const tableStructure = await this.getTableStructure(tableName);
      for (const key in primaryKey) {
        const foundKeySchema = tableStructure.find((el) => el.column_name === key);
        if (foundKeySchema?.data_type === 'number') {
          const numericValue = Number(primaryKey[key]);
          if (!isNaN(numericValue)) {
            primaryKey[key] = numericValue;
          } else {
            continue;
          }
        }
      }
      const { documentClient } = this.getDynamoDb();
      const params = {
        TableName: tableName,
        Key: marshall(primaryKey),
        ReturnValues: 'ALL_OLD' as const,
      };
      await documentClient.send(new DeleteItemCommand(params));
      return primaryKey;
    } catch (e) {
      e.message += '.';
      throw e;
    }
  }

  public async getIdentityColumns(
    _tableName: string,
    _referencedFieldName: string,
    _identityColumnName: string,
    _fieldValues: Array<string | number>,
  ): Promise<Array<Record<string, unknown>>> {
    return [];
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const tableStructure = await this.getTableStructure(tableName);
    for (const key in primaryKey) {
      const foundKeySchema = tableStructure.find((el) => el.column_name === key);
      if (foundKeySchema?.data_type === 'number') {
        const numericValue = Number(primaryKey[key]);
        if (!isNaN(numericValue)) {
          primaryKey[key] = numericValue;
        } else {
          continue;
        }
      }
    }
    let availableFields: string[] = [];
    if (settings) {
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    const { documentClient } = this.getDynamoDb();
    const params = {
      TableName: tableName,
      Key: marshall(primaryKey),
    };
    const result = await documentClient.send(new GetItemCommand(params));

    const foundRow = result.Item ? this.transformAndFilterRow(result.Item, availableFields, tableStructure) : null;
    if (!foundRow) {
      return null;
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
    const { dynamoDb } = this.getDynamoDb();

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
    const expressionAttributeNames: { [key: string]: string } = {};

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

      const result = await dynamoDb.scan(params);
      const rows = result.Items;
      const large_dataset = rows.length >= DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT;

      return {
        data: rows.map((row) => this.transformAndFilterRow(row, availableFields, tableStructure)),
        large_dataset,
        pagination: {} as any,
      };
    }

    if (searchedFieldValue && settings.search_fields?.length > 0) {
      const searchFields = settings.search_fields.length > 0 ? settings.search_fields : availableFields;
      filterExpression = searchFields
        .map((field) => {
          const fieldInfo = tableStructure.find((el) => el.column_name === field);
          const isNumberField = fieldInfo?.data_type === 'number';
          if (isNumberField) {
            const numericValue = Number(searchedFieldValue);
            if (!isNaN(numericValue)) {
              expressionAttributeValues[`:${field}_value`] = { N: String(numericValue) };
              return `#${field} = :${field}_value`;
            }
            return null;
          } else {
            expressionAttributeValues[`:${field}_value`] = { S: searchedFieldValue };
            return `begins_with(#${field}, :${field}_value)`;
          }
        })
        .filter((expression) => expression !== null)
        .join(' OR ');

      searchFields.forEach((field) => {
        expressionAttributeNames[`#${field}`] = field;
      });
    }

    if (filteringFields?.length > 0) {
      filteringFields.forEach((filter, index) => {
        const { field, criteria, value } = filter;
        expressionAttributeNames[`#${field}`] = field;
        const uniquePlaceholder = `:${field}${index}`;
        switch (criteria) {
          case FilterCriteriaEnum.eq:
            filterExpression += ` AND #${field} = ${uniquePlaceholder}`;
            expressionAttributeValues[uniquePlaceholder] = { S: value };
            break;
          case FilterCriteriaEnum.contains:
            filterExpression += ` AND contains(#${field}, ${uniquePlaceholder})`;
            expressionAttributeValues[uniquePlaceholder] = { S: value };
            break;
          case FilterCriteriaEnum.gt:
            filterExpression += ` AND #${field} > ${uniquePlaceholder}`;
            expressionAttributeValues[uniquePlaceholder] = { N: value };
            break;
          case FilterCriteriaEnum.lt:
            filterExpression += ` AND #${field} < ${uniquePlaceholder}`;
            expressionAttributeValues[uniquePlaceholder] = { N: value };
            break;
          case FilterCriteriaEnum.gte:
            filterExpression += ` AND #${field} >= ${uniquePlaceholder}`;
            expressionAttributeValues[uniquePlaceholder] = { N: value };
            break;
          case FilterCriteriaEnum.lte:
            filterExpression += ` AND #${field} <= ${uniquePlaceholder}`;
            expressionAttributeValues[uniquePlaceholder] = { N: value };
            break;
          case FilterCriteriaEnum.icontains:
            filterExpression += ` AND NOT contains(#${field}, ${uniquePlaceholder})`;
            expressionAttributeValues[uniquePlaceholder] = { S: value };
            break;
          case FilterCriteriaEnum.startswith:
            filterExpression += ` AND begins_with(#${field}, ${uniquePlaceholder})`;
            expressionAttributeValues[uniquePlaceholder] = { S: value };
            break;
          case FilterCriteriaEnum.endswith:
            filterExpression += ` AND ends_with(#${field}, ${uniquePlaceholder})`;
            expressionAttributeValues[uniquePlaceholder] = { S: value };
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

      const result = await dynamoDb.scan(params);

      rows = rows.concat(result.Items);

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
      data: rows.map((row) => this.transformAndFilterRow(row, availableFields, tableStructure)),
      pagination,
      large_dataset,
    };
  }

  public async getTableForeignKeys(_tableName: string): Promise<Array<ForeignKeyDS>> {
    return [];
  }

  public async getTablePrimaryColumns(tableName: string): Promise<Array<PrimaryKeyDS>> {
    const { dynamoDb } = this.getDynamoDb();
    const params = {
      TableName: tableName,
    };
    const tableDescription = await dynamoDb.describeTable(params);
    const keySchema = tableDescription.Table.KeySchema;
    const attributeDefinitions = tableDescription.Table.AttributeDefinitions;

    const primaryKeys = keySchema.map((key) => {
      const attributeDefinition = attributeDefinitions.find((attr) => attr.AttributeName === key.AttributeName);
      return {
        column_name: key.AttributeName,
        data_type: this.convertTypeName(attributeDefinition.AttributeType),
      };
    });
    return primaryKeys;
  }

  public async getTablesFromDB(): Promise<Array<TableDS>> {
    const { dynamoDb } = this.getDynamoDb();
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
    return this.getTableStructureOrReturnPrimaryKeysIfNothingToScan(tableName);
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    const { dynamoDb } = this.getDynamoDb();
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
    try {
      const tableStructure = await this.getTableStructure(tableName);
      row = this.convertHexDataToBinaryInBinarySets(row, tableStructure);
      for (const key in primaryKey) {
        const foundKeySchema = tableStructure.find((el) => el.column_name === key);
        if (foundKeySchema?.data_type === 'number') {
          const numericValue = Number(primaryKey[key]);
          if (!isNaN(numericValue)) {
            primaryKey[key] = numericValue;
          } else {
            continue;
          }
        }
      }
      const { documentClient } = this.getDynamoDb();
      const params = {
        TableName: tableName,
        Key: marshall(primaryKey),
        AttributeUpdates: Object.entries(row).reduce((acc, [key, value]) => {
          acc[key] = {
            Action: 'PUT',
            Value: marshall({ [key]: value })[key],
          };
          return acc;
        }, {}),
        ReturnValues: 'ALL_NEW' as const,
      };
      await documentClient.send(new UpdateItemCommand(params));
      const primaryKeyColumns = await this.getTablePrimaryColumns(tableName);
      const responseObject = {};
      primaryKeyColumns.forEach((key) => {
        responseObject[key.column_name] = row[key.column_name];
      });
      return responseObject;
    } catch (e) {
      e.message += '.';
      throw e;
    }
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Array<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const { documentClient } = this.getDynamoDb();
    const structure = await this.getTableStructure(tableName);
    newValues = this.convertHexDataToBinaryInBinarySets(newValues, structure);
    const updatePromises = primaryKeys.map((primaryKey) => {
      const updateExpression =
        'SET ' +
        Object.keys(newValues)
          .map((key, index) => `#key${index} = :value${index}`)
          .join(', ');
      const expressionAttributeNames = Object.keys(newValues).reduce((acc, key, index) => {
        acc[`#key${index}`] = key;
        return acc;
      }, {});
      const expressionAttributeValues = Object.keys(newValues).reduce((acc, key, index) => {
        acc[`:value${index}`] = newValues[key];
        return acc;
      }, {});

      const params = {
        TableName: tableName,
        Key: marshall(primaryKey),
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW' as const,
      };

      return documentClient.send(new UpdateItemCommand(params));
    });

    await Promise.all(updatePromises);
    return primaryKeys as any;
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
    const fileStream = new Stream.PassThrough();
    fileStream.end(file.buffer);

    return new Promise((resolve, reject) => {
      fileStream
        .pipe(csv.parse({ columns: true }))
        .on('data', async (data) => {
          try {
            await this.addRowInTable(tableName, data);
          } catch (err) {
            reject(err);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  public async executeRawQuery(_query: string): Promise<Array<Record<string, unknown>>> {
    throw new Error('Method not implemented.');
  }

  private convertHexDataToBinaryInBinarySets(
    row: Record<string, unknown>,
    tableStructure: Array<TableStructureDS>,
  ): Record<string, unknown> {
    const binarySetColumns = tableStructure
      .map((el) => {
        return {
          column_name: el.column_name,
          data_type: el.data_type,
          dynamo_db_type: el.dynamo_db_type,
        };
      })
      .filter((el) => {
        return el?.dynamo_db_type === 'BS';
      });

    if (binarySetColumns.length) {
      for (const column of binarySetColumns) {
        if (row[column.column_name] && Array.isArray(row[column.column_name])) {
          try {
            row[column.column_name] = (row[column.column_name] as string[]).map((value) => hexToBinary(value));
          } catch (_e) {
            continue;
          }
        }
      }
    }
    return row;
  }

  private getDynamoDb(): DdAndClient {
    const endpoint = this.connection.host;
    const accessKeyId = this.connection.username;
    const secretAccessKey = this.connection.password;
    const regionMatch = endpoint.match(/dynamodb\.(.+?)\.amazonaws\.com/);
    const region = regionMatch ? regionMatch[1] : 'us-east-1';
    const dynamoDb = new DynamoDB({
      endpoint: endpoint,
      region: process.env.NODE_ENV === 'test' ? 'localhost' : region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    const documentClient = DynamoDBDocumentClient.from(dynamoDb);
    return { dynamoDb, documentClient };
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
      case 'BOOL':
        return 'boolean';
      case 'L':
        return 'array';
      case 'M':
        return 'json';
      case 'SS':
        return 'array';
      case 'NS':
        return 'array';
      case 'BS':
        return 'array';
      case 'NULL':
        return 'null';
      default:
        return 'string';
    }
  }

  private transformAndFilterRow(
    row: { [key: string]: { [type: string]: any } },
    availableFields: string[],
    tableStructure: Array<TableStructureDS>,
  ): { [key: string]: any } {
    const transformedRow: { [key: string]: any } = {};

    Object.keys(row).forEach((key) => {
      const attribute = row[key];
      const attributeType = Object.keys(attribute)[0];
      transformedRow[key] = attribute[attributeType];
      const fieldInfo = tableStructure.find((el) => el.column_name === key);
      if (fieldInfo?.data_type === 'number') {
        const valueToNumber = Number(transformedRow[key]);
        if (!isNaN(valueToNumber)) {
          transformedRow[key] = valueToNumber;
        }
      }
      if (fieldInfo?.dynamo_db_type === 'BS') {
        const valuesArray = transformedRow[key];
        transformedRow[key] = valuesArray.map((value) => binaryToHex(value));
      }
    });

    if (availableFields.length > 0) {
      Object.keys(transformedRow).forEach((key) => {
        if (!availableFields.includes(key)) {
          delete transformedRow[key];
        }
      });
    }

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
      const { dynamoDb } = this.getDynamoDb();
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

        const result = await dynamoDb.scan(params);
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

  private async getTableStructureOrReturnPrimaryKeysIfNothingToScan(
    tableName: string,
  ): Promise<Array<TableStructureDS>> {
    try {
      const { dynamoDb } = this.getDynamoDb();
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
            const attributeValue = item[key];
            const attributeType = Object.keys(attributeValue)[0];
            attributeTypes[key] = attributeType;
          }
        });
      });

      const tableStructure: Array<TableStructureDS> = Object.keys(attributeTypes).map((attributeName) => {
        return {
          allow_null: true,
          character_maximum_length: null,
          column_default: null,
          column_name: attributeName,
          data_type: this.convertTypeName(attributeTypes[attributeName]),
          data_type_params: null,
          udt_name: null,
          extra: null,
          dynamo_db_type: (attributeTypes[attributeName] as DynamoDBType) ?? null,
        };
      });

      if (!tableStructure.length) {
        const primaryKeys = await this.getTablePrimaryColumns(tableName);
        return primaryKeys.map((key) => {
          return {
            allow_null: false,
            character_maximum_length: null,
            column_default: null,
            column_name: key.column_name,
            data_type: key.data_type,
            data_type_params: null,
            udt_name: null,
            extra: null,
          };
        });
      }

      return tableStructure;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
