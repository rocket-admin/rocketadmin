import { ConnectionEntity } from '../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';

export async function findTablesInConnectionUtil(
  connection: ConnectionEntity,
  userId: string,
  userEmail = 'unknown',
): Promise<Array<string>> {
  const dao = getDataAccessObject(connection);
  const tables = await dao.getTablesFromDB(userEmail);
  return tables.map((table) => table.tableName);
}
