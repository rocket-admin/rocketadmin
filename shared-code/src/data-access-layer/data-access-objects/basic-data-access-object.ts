import { attachPaginate } from 'knex-paginate';
import { KnexManager } from '../../knex-manager/knex-manager.js';
import { ConnectionParams } from '../shared/data-structures/connections-params.ds.js';
import { Knex } from 'knex';
import { isObjectEmpty } from '../../helpers/is-object-empty.js';
import { comparePrimitiveArrayElements } from '../../helpers/compate-primitive-array-elements.js';
import { TableStructureDS } from '../shared/data-structures/table-structure.ds.js';
import { TableSettingsDS } from '../shared/data-structures/table-settings.ds.js';
attachPaginate();

export class BasicDataAccessObject {
  protected connection: ConnectionParams;

  constructor(connection: ConnectionParams) {
    this.connection = connection;
  }
  public async configureKnex(): Promise<Knex<any, any[]>> {
    const knexManager = KnexManager.knexStorage();
    return knexManager.get(this.connection.type)(this.connection);
  }

  protected findAvaliableFields(
    settings: TableSettingsDS,
    tableStructure: Array<TableStructureDS>,
  ): Array<string> {
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
      if (!comparePrimitiveArrayElements(settings.list_fields, fieldsFromStructure)) {
        availableFields = [...settings.list_fields, ...fieldsFromStructure];
        availableFields = [...new Set(availableFields)];
        availableFields = availableFields.filter((fieldName) => {
          return fieldsFromStructure.includes(fieldName);
        });
      } else {
        availableFields = settings.list_fields;
      }
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
}
