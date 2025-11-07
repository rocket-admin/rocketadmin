import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';
import { FilterCriteriaEnum } from '../../../enums/filter-criteria.enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { validateStringWithEnum } from '../../../helpers/validators/validate-string-with-enum.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { CreateTableFilterDs } from '../application/data-structures/create-table-filters.ds.js';
import { UpdateTableFilterDs } from '../application/data-structures/update-table-filters.ds.js';

export class UpdateTableFilterValidationDs extends UpdateTableFilterDs {
  table_name: string;
}

export async function validateFiltersData(
  inputData: CreateTableFilterDs | UpdateTableFilterValidationDs,
  foundConnection: ConnectionEntity,
): Promise<Array<string>> {
  const { table_name, filters, dynamic_filtered_column } = inputData;
  const errors: Array<string> = [];
  try {
    const dao = getDataAccessObject(foundConnection);
    const tablesInConnection = await dao.getTablesFromDB();
    const tableNames = tablesInConnection.map((table) => table.tableName);
    if (!tableNames.includes(table_name)) {
      errors.push(Messages.TABLE_NOT_FOUND);
    }
    if (errors.length > 0) {
      return errors;
    }
    const tableStructure = await dao.getTableStructure(table_name, null);
    const tableColumnNames = tableStructure.map((el) => el.column_name);

    for (const column_name in filters) {
      if (!tableColumnNames.includes(column_name)) {
        errors.push(Messages.NO_SUCH_FIELD_IN_TABLE(column_name, table_name));
      }
      // eslint-disable-next-line security/detect-object-injection
      for (const filterCriteria in filters[column_name]) {
        if (!validateStringWithEnum(filterCriteria, FilterCriteriaEnum)) {
          errors.push(`Invalid filter criteria: "${filterCriteria}".`);
        }
      }
    }
    if (dynamic_filtered_column) {
      if (!tableColumnNames.includes(dynamic_filtered_column.column_name)) {
        errors.push(Messages.NO_SUCH_FIELD_IN_TABLE(dynamic_filtered_column.column_name, table_name));
      }
      if (!validateStringWithEnum(dynamic_filtered_column.comparator, FilterCriteriaEnum)) {
        errors.push(`Invalid filter criteria: "${dynamic_filtered_column.comparator}".`);
      }
    }
    return errors;
  } catch (error) {
    throw error;
  }
}
