import { EncryptionAlgorithmEnum, WidgetTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getPropertyValueByDescriptor } from '../../../helpers/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { ForeignKeyDSInfo } from '../../table/table-datastructures.js';
import { findTableFieldsUtil } from '../../table/utils/find-table-fields.util.js';
import { findTablesInConnectionUtil } from '../../table/utils/find-tables-in-connection.util.js';
import { CreateTableWidgetDs } from '../application/data-sctructures/create-table-widgets.ds.js';
import JSON5 from 'json5';

export async function validateCreateWidgetsDs(
  widgetsDS: Array<CreateTableWidgetDs>,
  userId: string,
  connection: ConnectionEntity,
  tableName: string,
  userEmail: string,
): Promise<Array<string>> {
  const errors = [];
  const availableTablesInConnection = await findTablesInConnectionUtil(connection, userId, userEmail);
  if (!availableTablesInConnection.includes(tableName)) {
    errors.push(Messages.TABLE_NOT_FOUND);
    return errors;
  }
  const availableTableFields = await findTableFieldsUtil(connection, tableName, userId, userEmail);
  if (!widgetsDS || !Array.isArray(widgetsDS)) {
    errors.push(Messages.WIDGETS_PROPERTY_MISSING);
    return errors;
  }

  for (const widgetDS of widgetsDS) {
    if (!widgetDS.field_name) {
      errors.push(Messages.WIDGET_FIELD_NAME_MISSING);
    } else {
      const fieldIndex = availableTableFields.indexOf(widgetDS.field_name);
      if (fieldIndex < 0) {
        errors.push(Messages.EXCLUDED_OR_NOT_EXISTS(widgetDS.field_name));
      }
    }
    const { widget_type } = widgetDS;
    // if (widget_type) {
    //   if (!Object.keys(WidgetTypeEnum).find((key) => key === widget_type)) {
    //     errors.push(Messages.WIDGET_TYPE_INCORRECT);
    //   }
    // }
    if (widget_type && widget_type === WidgetTypeEnum.Password) {
      if (
        widgetDS.widget_params['algorithm'] &&
        !Object.keys(EncryptionAlgorithmEnum).find((key) => key === widgetDS.widget_params['algorithm'])
      ) {
        errors.push(Messages.ENCRYPTION_ALGORITHM_INCORRECT(widgetDS.widget_params['algorithm']));
      }
      if (widgetDS.widget_params['encrypt'] === undefined) {
        errors.push(Messages.WIDGET_REQUIRED_PARAMETER_MISSING('encrypt'));
      }
    }

    if (widget_type && widget_type === WidgetTypeEnum.Foreign_key) {
      const widget_params: ForeignKeyDSInfo = JSON5.parse(widgetDS.widget_params);

      for (const key in widget_params) {
        if (!Constants.FOREIGN_KEY_FIELDS.includes(key)) {
          errors.push(Messages.WIDGET_PARAMETER_UNSUPPORTED(key, widgetDS.widget_type));
          continue;
        }
        if (!getPropertyValueByDescriptor(widget_params, key) && key !== 'constraint_name') {
          errors.push(Messages.WIDGET_REQUIRED_PARAMETER_MISSING(key));
        }
      }
      if (errors.length > 0) {
        return errors;
      }
      if (!availableTablesInConnection.includes(widget_params.referenced_table_name)) {
        errors.push(Messages.TABLE_WITH_NAME_NOT_EXISTS(widget_params.referenced_table_name));
        return errors;
      }
      const foreignTableFields = await findTableFieldsUtil(
        connection,
        widget_params.referenced_table_name,
        userId,
        userEmail,
      );
      if (!foreignTableFields.includes(widget_params.referenced_column_name)) {
        errors.push(
          Messages.NO_SUCH_FIELD_IN_TABLE(widget_params.referenced_column_name, widget_params.referenced_table_name),
        );
      }
    }
  }
  return errors;
}
