import { Stream, Readable } from 'stream';
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
import { IDataAccessObject } from '../shared/interfaces/data-access-object.interface.js';
import { BasicDataAccessObject } from './basic-data-access-object.js';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { DAO_CONSTANTS } from '../../helpers/data-access-objects-constants.js';
import { FilterCriteriaEnum } from '../shared/enums/filter-criteria.enum.js';
import { tableSettingsFieldValidator } from '../../helpers/validation/table-settings-validator.js';
import { ERROR_MESSAGES } from '../../helpers/errors/error-messages.js';
import { LRUStorage } from '../../caching/lru-storage.js';
import getPort from 'get-port';
import { getTunnel } from '../../helpers/get-ssh-tunnel.js';
import * as BSON from 'bson';
import * as csv from 'csv';

export type MongoClientDB = {
  db: Db;
  dbClient: MongoClient;
};

export class DataAccessObjectMongo extends BasicDataAccessObject implements IDataAccessObject {
  constructor(connection: ConnectionParams) {
    super(connection);
  }

  public async addRowInTable(
    tableName: string,
    row: Record<string, unknown>,
  ): Promise<number | Record<string, unknown>> {
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    delete row._id;
    const result = await collection.insertOne(row);
    return { _id: this.processMongoIdField(result?.insertedId) };
  }

  public async deleteRowInTable(
    tableName: string,
    primaryKey: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    const objectId = this.createObjectIdFromSting(primaryKey._id as string);
    await collection.deleteOne({ _id: objectId });
    return { _id: this.processMongoIdField(objectId) };
  }

  public async getIdentityColumns(
    tableName: string,
    referencedFieldName: string,
    identityColumnName: string,
    fieldValues: (string | number)[],
  ): Promise<Record<string, unknown>[]> {
    return [];
  }

  public async getRowByPrimaryKey(
    tableName: string,
    primaryKey: Record<string, unknown>,
    settings: TableSettingsDS,
  ): Promise<Record<string, unknown>> {
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    const objectId = this.createObjectIdFromSting(primaryKey._id as string);

    let availableFields: string[] = [];
    if (settings) {
      const tableStructure = await this.getTableStructure(tableName);
      availableFields = this.findAvailableFields(settings, tableStructure);
    }

    const foundRow = await collection.findOne({ _id: objectId });
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
    return {
      ...foundRow,
      _id: this.processMongoIdField(objectId),
    };
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
    page = page > 0 ? page : DAO_CONSTANTS.DEFAULT_PAGINATION.page;
    perPage =
      perPage > 0
        ? perPage
        : settings.list_per_page > 0
          ? settings.list_per_page
          : DAO_CONSTANTS.DEFAULT_PAGINATION.perPage;

    const offset = (page - 1) * perPage;
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);

    const tableStructure = await this.getTableStructure(tableName);
    const availableFields = this.findAvailableFields(settings, tableStructure);

    if (autocompleteFields?.value && autocompleteFields.fields?.length > 0) {
      const { fields, value } = autocompleteFields;
      const query = fields.reduce((acc, field) => {
        acc[field] = new RegExp(String(value), 'i');
        return acc;
      }, {});
      const rows = await collection.find(query).limit(DAO_CONSTANTS.AUTOCOMPLETE_ROW_LIMIT).toArray();
      const { large_dataset } = await this.getRowsCount(tableName, query);
      return {
        data: rows.map((row) => {
          Object.keys(row).forEach((key) => {
            if (!availableFields.includes(key)) {
              delete row[key];
            }
          });
          return {
            ...row,
            _id: this.processMongoIdField(row?._id),
          };
        }),
        large_dataset,
        pagination: {} as any,
      };
    }

    const query = {};

    let { search_fields } = settings;
    if ((!search_fields || search_fields?.length === 0) && searchedFieldValue) {
      search_fields = availableFields;
    }

    if (searchedFieldValue && search_fields?.length > 0) {
      const searchQuery = search_fields.reduce((acc, field) => {
        let condition;
        if (field === '_id') {
          const parsedSearchedFieldValue = Buffer.from(searchedFieldValue, 'binary').toString('hex');
          condition = { [field]: this.createObjectIdFromSting(parsedSearchedFieldValue) };
        } else {
          condition = { [field]: new RegExp('^' + String(searchedFieldValue), 'i') };
        }
        acc.push(condition);
        return acc;
      }, []);
      Object.assign(query, { $or: searchQuery });
    }

    if (filteringFields?.length > 0) {
      const groupedFilters = filteringFields.reduce((acc, filterObject) => {
        let { field, criteria, value } = filterObject;
        if (field === '_id') {
          value = this.createObjectIdFromSting(value as string);
        }
        if (!acc[field]) {
          acc[field] = {};
        }
        switch (criteria) {
          case FilterCriteriaEnum.eq:
            acc[field] = value;
            break;
          case FilterCriteriaEnum.contains:
            acc[field] = new RegExp(String(value), 'i');
            break;
          case FilterCriteriaEnum.gt:
            acc[field]['$gt'] = value;
            break;
          case FilterCriteriaEnum.lt:
            acc[field]['$lt'] = value;
            break;
          case FilterCriteriaEnum.gte:
            acc[field]['$gte'] = value;
            break;
          case FilterCriteriaEnum.lte:
            acc[field]['$lte'] = value;
            break;
          case FilterCriteriaEnum.icontains:
            acc[field]['$not'] = new RegExp(String(value), 'i');
            break;
          case FilterCriteriaEnum.startswith:
            acc[field] = new RegExp(`^${String(value)}`, 'i');
            break;
          case FilterCriteriaEnum.endswith:
            acc[field] = new RegExp(`${String(value)}$`, 'i');
            break;
          case FilterCriteriaEnum.empty:
            acc[field]['$exists'] = false;
            break;
          default:
            break;
        }
        return acc;
      }, {});

      Object.assign(query, groupedFilters);
    }

    const { large_dataset, rowsCount } = await this.getRowsCount(tableName, query);
    const rows = await collection.find(query).skip(offset).limit(perPage).toArray();
    const pagination = {
      total: rowsCount,
      lastPage: Math.ceil(rowsCount / perPage),
      perPage: perPage,
      currentPage: page,
    };
    return {
      data: rows.map((row) => {
        Object.keys(row).forEach((key) => {
          if (!availableFields.includes(key)) {
            delete row[key];
          }
        });
        return {
          ...row,
          _id: this.processMongoIdField(row?._id),
        };
      }),
      pagination,
      large_dataset,
    };
  }

  public async getTableForeignKeys(tableName: string): Promise<ForeignKeyDS[]> {
    return [];
  }

  public async getTablePrimaryColumns(tableName: string): Promise<PrimaryKeyDS[]> {
    return [
      {
        column_name: '_id',
        data_type: 'string',
      },
    ];
  }

  public async getTablesFromDB(): Promise<TableDS[]> {
    const db = await this.getConnectionToDatabase();
    const collections = await db.listCollections().toArray();
    return collections.map((collection) => {
      return {
        tableName: collection.name,
        isView: false,
      };
    });
  }

  public async getTableStructure(tableName: string): Promise<TableStructureDS[]> {
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    let document = await collection.findOne({});
    if (!document) {
      return [];
    }
    const structure: TableStructureDS[] = Object.keys(document).map((key) => ({
      allow_null: document[key] === null,
      character_maximum_length: null,
      column_default: key === '_id' ? 'autoincrement' : null,
      column_name: key,
      data_type: key === '_id' ? 'string' : this.getMongoDataTypeByValue(document[key]),
      data_type_params: null,
      udt_name: null,
      extra: null,
    }));

    return structure;
  }

  public async testConnect(): Promise<TestConnectionResultDS> {
    try {
      await this.getConnectionToDatabase();
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
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    const objectId = this.createObjectIdFromSting(primaryKey._id as string);
    delete row._id;
    await collection.updateOne({ _id: objectId }, { $set: row });
    return { _id: this.processMongoIdField(objectId) };
  }

  public async bulkUpdateRowsInTable(
    tableName: string,
    newValues: Record<string, unknown>,
    primaryKeys: Record<string, unknown>[],
  ): Promise<Record<string, unknown>> {
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    const objectIds = primaryKeys.map((primaryKey) => this.createObjectIdFromSting(primaryKey._id as string));
    await collection.updateMany({ _id: { $in: objectIds } }, { $set: newValues });
    return { _id: objectIds.map((objectId) => this.processMongoIdField(objectId)) };
  }

  public async validateSettings(settings: ValidateTableSettingsDS, tableName: string): Promise<string[]> {
    const [tableStructure, primaryColumns] = await Promise.all([
      this.getTableStructure(tableName),
      this.getTablePrimaryColumns(tableName),
    ]);
    return tableSettingsFieldValidator(tableStructure, primaryColumns, settings);
  }

  public async getReferencedTableNamesAndColumns(tableName: string): Promise<ReferencedTableNamesAndColumnsDS[]> {
    return [];
  }

  public async isView(tableName: string): Promise<boolean> {
    return false;
  }

  public async importCSVInTable(file: Express.Multer.File, tableName: string): Promise<void> {
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);
    const parser = stream.pipe(csv.parse({ columns: true }));
    const results: any[] = [];
    for await (const record of parser) {
      results.push(record);
    }
    try {
      await collection.insertMany(results);
    } catch (error) {
      throw error;
    }
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
    );
    return result.data as any;
  }

  private async getConnectionToDatabase(): Promise<Db> {
    if (this.connection.ssh) {
      const { db } = await this.createTunneledConnection(this.connection);
      return db;
    }
    const { db } = await this.getUsualConnection();
    return db;
  }

  private async getUsualConnection(): Promise<MongoClientDB> {
    const cachedDatabase = LRUStorage.getMongoDbCache(this.connection);
    if (cachedDatabase) {
      return cachedDatabase;
    }

    let mongoConnectionString = '';
    if (this.connection.host.includes('mongodb+srv')) {
      const hostNameParts = this.connection.host.split('//');
      mongoConnectionString = `${hostNameParts[0]}//${this.connection.username}:${this.connection.password}@${hostNameParts[1]}`;
    } else {
      mongoConnectionString = `mongodb://${this.connection.username}:${this.connection.password}@${this.connection.host}:${this.connection.port}/${this.connection.database ? this.connection.database : ''}`;
    }

    let options: any = {};
    if (this.connection.ssl) {
      mongoConnectionString += `?ssl=true`;
      options = {
        ssl: true,
        sslValidate: this.connection?.cert ? true : false,
        sslCA: this.connection?.cert,
      };
    }
    if (this.connection.authSource) {
      if (mongoConnectionString.includes('?')) {
        mongoConnectionString += '&';
      } else {
        mongoConnectionString += '?';
      }
      mongoConnectionString += `authSource=${this.connection.authSource}`;
    }

    const client = new MongoClient(mongoConnectionString, options);
    let clientDb: MongoClientDB;
    try {
      const connectedClient = await client.connect();
      clientDb = { db: connectedClient.db(this.connection.database), dbClient: connectedClient };
      LRUStorage.setMongoDbCache(this.connection, clientDb);
    } catch (error) {
      console.error(error);
      throw error;
    }
    return clientDb;
  }

  private async createTunneledConnection(connection: ConnectionParams): Promise<MongoClientDB> {
    const connectionCopy = { ...connection };
    return new Promise<MongoClientDB>(async (resolve, reject): Promise<MongoClientDB> => {
      const cachedTnl = LRUStorage.getTunnelCache(connectionCopy);
      if (cachedTnl && cachedTnl.mongo && cachedTnl.server && cachedTnl.client) {
        resolve(cachedTnl.db);
        return;
      }

      const freePort = await getPort();

      try {
        const [server, client] = await getTunnel(connectionCopy, freePort);
        connection.host = '127.0.0.1';
        connection.port = freePort;
        const database = await this.getUsualConnection();

        const tnlCachedObj = {
          server: server,
          client: client,
          mongo: database,
        };
        LRUStorage.setTunnelCache(connectionCopy, tnlCachedObj);
        resolve(tnlCachedObj.mongo);
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

  private async getRowsCount(
    tableName: string,
    query: Record<string, any>,
  ): Promise<{ rowsCount: number; large_dataset: boolean }> {
    const db = await this.getConnectionToDatabase();
    const collection = db.collection(tableName);
    const count = await collection.countDocuments(query);
    return { rowsCount: count, large_dataset: count > DAO_CONSTANTS.LARGE_DATASET_ROW_LIMIT };
  }

  private createObjectIdFromSting(id: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch (error) {
      throw new Error(ERROR_MESSAGES.INVALID_OBJECT_ID_FORMAT);
    }
  }

  private getMongoDataTypeByValue(value: unknown): string {
    switch (true) {
      case Array.isArray(value):
        return 'array';
      case typeof value === 'object' && value !== null:
        return 'object';
      case value instanceof BSON.Double:
        return 'double';
      case value instanceof BSON.Int32:
        return 'int32';
      case value instanceof BSON.Binary:
        return 'binary';
      case value instanceof BSON.ObjectId:
        return 'objectid';
      case value instanceof BSON.Timestamp:
        return 'timestamp';
      case value instanceof BSON.Long:
        return 'long';
      case value instanceof BSON.Decimal128:
        return 'decimal128';
      case value instanceof BSON.BSONRegExp:
        return 'regexp';
      case typeof value === 'string':
        return 'string';
      case typeof value === 'number':
        return 'number';
      case typeof value === 'boolean':
        return 'boolean';
      case value instanceof Date:
        return 'date';
      default:
        return 'unknown';
    }
  }

  private processMongoIdField(_id: unknown): string | undefined {
    if (!_id) {
      return;
    }
    if (typeof _id === 'string') {
      return _id;
    }
    if (_id instanceof ObjectId) {
      return (_id as ObjectId).toHexString();
    }
    try {
      return _id.toString();
    } catch (_error) {}
    try {
      return new ObjectId(_id as string).toHexString();
    } catch (_error) {
      return _id as any;
    }
  }
}
