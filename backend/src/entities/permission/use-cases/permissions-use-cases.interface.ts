import { InTransactionEnum } from '../../../enums/index.js';
import { CreatePermissionsDs, PermissionsDs } from '../application/data-structures/create-permissions.ds.js';

export interface ICreateOrUpdatePermissions {
  execute(inputData: CreatePermissionsDs, isTransaction: InTransactionEnum): Promise<PermissionsDs>;
}
