import { ConnectionEntity } from '../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';

export async function findTableFieldsUtil(
  connection: ConnectionEntity,
  tableName: string,
  userId: string,
  userEmail = 'unknown',
): Promise<Array<string>> {
  const dao = getDataAccessObject(connection);
  const tableStructure = await dao.getTableStructure(tableName, userEmail);
  return tableStructure.map((el) => el.column_name);
}
