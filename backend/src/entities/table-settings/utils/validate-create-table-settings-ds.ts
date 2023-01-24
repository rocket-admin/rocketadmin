import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object.js';

export async function validateCreateTableSettingsDs(
  inputData: CreateTableSettingsDs,
  connection: ConnectionEntity,
  userId: string,
): Promise<Array<string>> {
  const dao = createDataAccessObject(connection, userId);
  return await dao.validateSettings(inputData, inputData.table_name, undefined);
}
