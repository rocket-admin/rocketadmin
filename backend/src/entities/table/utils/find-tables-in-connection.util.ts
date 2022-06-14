import { ConnectionEntity } from '../../connection/connection.entity';
import { createDao } from '../../../dal/shared/create-dao';

export async function findTablesInConnectionUtil(
  connection: ConnectionEntity,
  userId: string,
  userEmail = 'unknown',
): Promise<Array<string>> {
  const dao = createDao(connection, userId);
  return await dao.getTablesFromDB(userEmail);
}
