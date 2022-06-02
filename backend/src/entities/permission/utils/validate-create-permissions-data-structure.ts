import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';

export function validateCreatePermissionsDataStructure(inputData: any): Array<string> {
  const { type, accessLevel, tableName } = inputData;
  const errors = [];

  if (!Object.keys(AccessLevelEnum).find((key) => key === accessLevel)) {
    errors.push(Messages.ACCESS_LEVEL_INVALID);
  }

  if (type === 'Table' && (!tableName || tableName.length <= 0)) {
    errors.push(Messages.TABLE_NAME_REQUIRED);
  }

  if (!Object.keys(PermissionTypeEnum).find((key) => key === type)) {
    errors.push(Messages.PERMISSION_TYPE_INVALID);
  }
  return errors;
}
