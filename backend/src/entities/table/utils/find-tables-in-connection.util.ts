import { ConnectionEntity } from '../../connection/connection.entity';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';

export async function findTablesInConnectionUtil(
  connection: ConnectionEntity,
  userId: string,
  userEmail = 'unknown',
): Promise<Array<string>> {
  const dao = createDataAccessObject(connection, userId);
  return await dao.getTablesFromDB(userEmail);
}
