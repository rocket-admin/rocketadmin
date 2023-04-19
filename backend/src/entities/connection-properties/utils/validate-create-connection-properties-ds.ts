import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';
import { toPrettyErrorsMsg } from '../../../helpers/index.js';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { HttpStatus } from '@nestjs/common';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';

export async function validateCreateConnectionPropertiesDs(
  createConnectionProperties: CreateConnectionPropertiesDs,
  connection: ConnectionEntity,
): Promise<boolean> {
  const { hidden_tables } = createConnectionProperties;
  const errors = [];
  const dao = getDataAccessObject(connection);
  const tablesInConnection = await dao.getTablesFromDB();
  if (!Array.isArray(hidden_tables)) {
    errors.push(Messages.HIDDEN_TABLES_MUST_BE_ARRAY);
  }
  if (hidden_tables && hidden_tables.length > 0) {
    for (const hiddenTable of hidden_tables) {
      if (!tablesInConnection.includes(hiddenTable)) {
        errors.push(Messages.TABLE_WITH_NAME_NOT_EXISTS(hiddenTable));
      }
    }
  }

  if (errors.length > 0) {
    throw new HttpException(
      {
        message: Messages.CONNECTION_PROPERTIES_INVALID + ' : ' + toPrettyErrorsMsg(errors),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
  return true;
}
