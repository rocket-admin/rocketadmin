import { ConnectionEntity } from '../../connection/connection.entity';
import { createDao } from '../../../dal/shared/create-dao';

export async function findTableFieldsUtil(
  connection: ConnectionEntity,
  tableName: string,
  userId: string,
  userEmail = 'unknown',
): Promise<Array<string>> {
  const dao = createDao(connection, userId);
  const tableStructure = await dao.getTableStructure(tableName, userEmail);
  return tableStructure.map((el) => el.column_name);
}
