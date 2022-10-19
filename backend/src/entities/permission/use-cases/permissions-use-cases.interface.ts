import { InTransactionEnum } from '../../../enums';
import { CreatePermissionsDs, PermissionsDs } from '../application/data-structures/create-permissions.ds';

export interface ICreateOrUpdatePermissions {
  execute(inputData: CreatePermissionsDs, isTransaction: InTransactionEnum): Promise<PermissionsDs>;
}
