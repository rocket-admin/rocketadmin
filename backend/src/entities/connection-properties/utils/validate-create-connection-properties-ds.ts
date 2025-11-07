import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';
import { toPrettyErrorsMsg } from '../../../helpers/index.js';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { HttpStatus } from '@nestjs/common';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';
import { validateTableCategories } from '../../table-categories/utils/validate-table-categories.util.js';

export async function validateCreateConnectionPropertiesDs(
  createConnectionProperties: CreateConnectionPropertiesDs,
  connection: ConnectionEntity,
): Promise<boolean> {
  const { hidden_tables, default_showing_table, table_categories } = createConnectionProperties;
  const errors = [];
  const dao = getDataAccessObject(connection);
  const tablesInConnection = (await dao.getTablesFromDB()).map((table) => table.tableName);
  if (hidden_tables && !Array.isArray(hidden_tables)) {
    errors.push(Messages.HIDDEN_TABLES_MUST_BE_ARRAY);
  }
  if (hidden_tables && hidden_tables.length > 0) {
    for (const hiddenTable of hidden_tables) {
      if (!tablesInConnection.includes(hiddenTable)) {
        errors.push(Messages.TABLE_WITH_NAME_NOT_EXISTS(hiddenTable));
      }
    }
    if (hidden_tables.includes(default_showing_table)) {
      errors.push(Messages.CANT_SHOW_TABLE_AND_EXCLUDE(default_showing_table));
    }
  }

  if (default_showing_table && !tablesInConnection.includes(default_showing_table)) {
    errors.push(Messages.TABLE_WITH_NAME_NOT_EXISTS(default_showing_table));
  }

  if (table_categories && table_categories.length > 0) {
    const tablesInCategories = table_categories.map((category) => category.tables).flat();
    const uniqueTablesInCategories = Array.from(new Set(tablesInCategories));
    for (const table of uniqueTablesInCategories) {
      if (!tablesInConnection.includes(table)) {
        errors.push(Messages.TABLE_WITH_NAME_NOT_EXISTS(table));
      }
      if (hidden_tables && hidden_tables.includes(table)) {
        errors.push(Messages.CANT_CATEGORIZE_HIDDEN_TABLE(table));
      }
    }

    await validateTableCategories(table_categories, connection);
  }

  if (errors.length > 0) {
    throw new HttpException(
      {
        message: Messages.CONNECTION_PROPERTIES_INVALID + ' : ' + toPrettyErrorsMsg(errors),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
  return true;
}
