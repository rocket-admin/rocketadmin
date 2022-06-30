import { ConnectionEntity } from '../../connection/connection.entity';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';

export async function findTableFieldsUtil(
  connection: ConnectionEntity,
  tableName: string,
  userId: string,
  userEmail = 'unknown',
): Promise<Array<string>> {
  const dao = createDataAccessObject(connection, userId);
  const tableStructure = await dao.getTableStructure(tableName, userEmail);
  return tableStructure.map((el) => el.column_name);
}
