import { Knex } from 'knex';
import { isObjectEmpty } from '../../helpers/is-object-empty.js';
import { KnexManager } from '../../knex-manager/knex-manager.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';

export class BasicDataAccessObject {
  protected connection: ConnectionParams;

  constructor(connection: ConnectionParams) {
    this.connection = connection;
  }
  protected async configureKnex(): Promise<Knex<any, any[]>> {
    const knexManager = KnexManager.knexStorage();
    return knexManager.get(this.connection.type)(this.connection);
  }

  protected findAvailableFields(settings: TableSettingsDS, tableStructure: Array<TableStructureDS>): Array<string> {
    let availableFields: Array<string> = [];
    const fieldsFromStructure = tableStructure.map((el) => {
      return el.column_name;
    });

    if (isObjectEmpty(settings)) {
      availableFields = tableStructure.map((el) => {
        return el.column_name;
      });
      return availableFields;
    }
    const excludedFields = settings.excluded_fields;

    if (settings.list_fields && settings.list_fields.length > 0) {
      const validListFields = settings.list_fields.filter((fieldName) => {
        return fieldsFromStructure.includes(fieldName);
      });

      const additionalFields = fieldsFromStructure.filter((fieldName) => {
        return !settings.list_fields.includes(fieldName);
      });

      availableFields = [...validListFields, ...additionalFields];
    } else {
      availableFields = tableStructure.map((el) => {
        return el.column_name;
      });
    }
    if (excludedFields && excludedFields.length > 0) {
      for (const field of excludedFields) {
        const delIndex = availableFields.indexOf(field);
        if (delIndex >= 0) {
          availableFields.splice(availableFields.indexOf(field), 1);
        }
      }
    }
    return availableFields;
  }

  protected validateNamesAndThrowError(names: string | Array<string>): void {
    if (typeof names === 'string') {
      if (!this.isValidName(names)) {
        throw new Error(`Parameter "${names}" is invalid`);
      }
    }
    if (Array.isArray(names)) {
      for (const name of names) {
        if (!this.isValidName(name)) {
          throw new Error(`Parameter "${name}" is invalid`);
        }
      }
    }
  }

  protected isDateTimeType(columnTypeName: string): boolean {
    const dateTimeDataTypes = [
      // PostgreSQL
      'DATE',
      'TIME',
      'TIMETZ',
      'TIMESTAMP',
      'TIMESTAMPTZ',

      // MySQL
      'DATE',
      'DATETIME',
      'TIMESTAMP',
      'TIME',
      'YEAR',

      // MS SQL Server
      'DATE',
      'DATETIME',
      'DATETIME2',
      'DATETIMEOFFSET',
      'SMALLDATETIME',
      'TIME',

      // OracleDB
      'DATE',
      'TIMESTAMP',
      'TIMESTAMP WITH TIME ZONE',
      'TIMESTAMP WITH LOCAL TIME ZONE',

      // IBM Db2
      'DATE',
      'TIME',
      'TIMESTAMP',
    ];
    return dateTimeDataTypes.includes(columnTypeName.toUpperCase());
  }

  private isValidName(name: string): boolean {
    return typeof name === 'string' && name.length > 0 && /^[a-zA-Z0-9_]+$/.test(name);
  }
}
