import { InTransactionEnum } from '../../../enums/index.js';
import { ActivateTableActionDS } from '../application/data-sctructures/activate-table-action.ds.js';
import { ActivateTableActionsDS } from '../application/data-sctructures/activate-table-actions.ds.js';
import {
  ActivatedTableActionDS,
  ActivatedTableActionsDS,
} from '../application/data-sctructures/activated-table-action.ds.js';
import { CreateTableActionDS } from '../application/data-sctructures/create-table-action.ds.js';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { FindTableActionsDS } from '../application/data-sctructures/find-table-actions.ds.js';
import { UpdateTableActionDS } from '../application/data-sctructures/update-table-action.ds.js';

export interface ICreateTableAction {
  execute(inputData: CreateTableActionDS, inTransaction: InTransactionEnum): Promise<CreatedTableActionDS>;
}

export interface IFindAllTableActions {
  execute(inputData: FindTableActionsDS, inTransaction: InTransactionEnum): Promise<Array<CreatedTableActionDS>>;
}

export interface IActivateTableAction {
  execute(inputData: ActivateTableActionDS, inTransaction: InTransactionEnum): Promise<ActivatedTableActionDS>;
}

export interface IActivateTableActions {
  execute(inputData: ActivateTableActionsDS, inTransaction: InTransactionEnum): Promise<ActivatedTableActionsDS>;
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
