import { ConnectionEntity } from '../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';

export async function findTablesInConnectionUtil(
  connection: ConnectionEntity,
  userId: string,
  userEmail = 'unknown',
): Promise<Array<string>> {
  const dao = getDataAccessObject(connection);
  return await dao.getTablesFromDB(userEmail);
}
