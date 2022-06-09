import { CreatePermissionsDs, PermissionsDs } from '../application/data-structures/create-permissions.ds';

export interface ICreateOrUpdatePermissions {
  execute(inputData: CreatePermissionsDs): Promise<PermissionsDs>;
}
