import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds';
import { ConnectionEntity } from '../../connection/connection.entity';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';

export async function validateCreateTableSettingsDs(
  inputData: CreateTableSettingsDs,
  connection: ConnectionEntity,
  userId: string,
): Promise<Array<string>> {
  const dao = createDataAccessObject(connection, userId);
  return await dao.validateSettings(inputData, inputData.table_name, undefined);
}
