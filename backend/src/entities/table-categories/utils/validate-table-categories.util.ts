import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { TableCategoryDS } from '../data-sctructures/create-or-update-table-categories.ds.js';
import { BadRequestException } from '@nestjs/common';

export async function validateTableCategories(
  tableCategoriesData: Array<TableCategoryDS>,
  connection: ConnectionEntity,
): Promise<boolean> {
  const dao = getDataAccessObject(connection);
  const tablesInConnection = (await dao.getTablesFromDB()).map((table) => table.tableName);
  const tables = tableCategoriesData.map((category) => category.tables).flat();
  const uniqueTables = Array.from(new Set(tables));
  const errors = [];
  for (const table of uniqueTables) {
    if (!tablesInConnection.includes(table)) {
      errors.push(`Table with name ${table} does not exist in the connection.`);
    }
  }
  if (errors.length > 0) {
    throw new BadRequestException('Table categories validation failed: ' + errors.join(', '));
  }
  return true;
}
