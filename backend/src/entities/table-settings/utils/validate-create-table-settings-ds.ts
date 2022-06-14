import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds';
import { ConnectionEntity } from '../../connection/connection.entity';
import { createDao } from '../../../dal/shared/create-dao';

export async function validateCreateTableSettingsDs(
  inputData: CreateTableSettingsDs,
  connection: ConnectionEntity,
  userId: string,
): Promise<Array<string>> {
  const dao = createDao(connection, userId);
  return await dao.validateSettings(inputData, inputData.table_name, undefined);
}
