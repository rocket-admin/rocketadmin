import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ValidateTableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/validate-table-settings.ds.js';
import { buildValidateTableSettingsDS } from '@rocketadmin/shared-code/dist/src/helpers/datascturcute-builders/validate-table-settings-ds.builder.js';

export async function validateCreateTableSettingsDs(
  inputData: CreateTableSettingsDs,
  connection: ConnectionEntity,
  userId: string,
): Promise<Array<string>> {
  const dao = getDataAccessObject(connection);
  const tableSettingsDs: ValidateTableSettingsDS = buildValidateTableSettingsDS(inputData);
  return await dao.validateSettings(tableSettingsDs, inputData.table_name, undefined);
}
