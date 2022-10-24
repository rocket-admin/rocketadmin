import { InTransactionEnum } from '../../../enums';
import { ActivateTableActionDS } from '../application/data-sctructures/activate-table-action.ds';
import { CreateTableActionDS } from '../application/data-sctructures/create-table-action.ds';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds';
import { FindTableActionsDS } from '../application/data-sctructures/find-table-actions.ds';
import { UpdateTableActionDS } from '../application/data-sctructures/update-table-action.ds';

export interface ICreateTableAction {
  execute(inputData: CreateTableActionDS, inTransaction: InTransactionEnum): Promise<CreatedTableActionDS>;
}

export interface IFindAllTableActions {
  execute(inputData: FindTableActionsDS, inTransaction: InTransactionEnum): Promise<Array<CreatedTableActionDS>>;
}

export interface IActivateTableAction {
  execute(inputData: ActivateTableActionDS, inTransaction: InTransactionEnum): Promise<void>;
}

export interface IUpdateTableAction {
  execute(inputData: UpdateTableActionDS, inTransaction: InTransactionEnum): Promise<CreatedTableActionDS>;
}

export interface IDeleteTableAction {
  execute(actionId: string, inTransaction: InTransactionEnum): Promise<CreatedTableActionDS>;
}

export interface IFindTableAction {
  execute(actionId: string, inTransaction: InTransactionEnum): Promise<CreatedTableActionDS>;
}