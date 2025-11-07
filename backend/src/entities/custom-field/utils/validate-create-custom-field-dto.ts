import { CreateFieldDto } from '../application/data-structures/create-custom-fields.ds.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getValuesBetweenCurlies, toPrettyErrorsMsg } from '../../../helpers/index.js';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import { HttpStatus } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';

export async function validateCreateCustomFieldDto(
  createFieldDto: CreateFieldDto,
  connection: ConnectionEntity,
  userId: string,
  tableName: string,
): Promise<void> {
  const errors = [];
  const { template_string, text, type } = createFieldDto;
  if (!type) errors.push(Messages.CUSTOM_FIELD_TYPE_MISSING);
  if (!text) errors.push(Messages.CUSTOM_FIELD_TEXT_MISSING);
  if (!template_string) errors.push(Messages.CUSTOM_FIELD_TEMPLATE_MISSING);
  if (type && type !== 'AA:Link') errors.push(Messages.CUSTOM_FIELD_TYPE_INCORRECT);
  const tableFieldsFromTemplate = getValuesBetweenCurlies(template_string);
  const dao = getDataAccessObject(connection);
  const tablesInConnection: Array<string> = (await dao.getTablesFromDB()).map((table) => table.tableName);
  const tableIndexInTables = tablesInConnection.findIndex((table_name) => table_name === tableName);
  if (tableIndexInTables < 0) {
    throw new HttpException(
      {
        message: Messages.TABLE_NOT_FOUND,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
  const tableStructure = await dao.getTableStructure(tableName, undefined);
  const tableColumns = tableStructure.map((el) => el.column_name);
  for (const field of tableFieldsFromTemplate) {
    const fieldIndex = tableColumns.indexOf(field);
    if (fieldIndex < 0) {
      errors.push(Messages.EXCLUDED_OR_NOT_EXISTS(field));
    }
  }
  if (errors.length > 0) {
    throw new HttpException(
      {
        message: toPrettyErrorsMsg(errors),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
