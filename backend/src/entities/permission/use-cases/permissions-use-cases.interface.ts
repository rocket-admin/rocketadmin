import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreatePermissionsDs, PermissionsDs } from '../application/data-structures/create-permissions.ds.js';

export interface ICreateOrUpdatePermissions {
	execute(inputData: CreatePermissionsDs, isTransaction: InTransactionEnum): Promise<PermissionsDs>;
}
