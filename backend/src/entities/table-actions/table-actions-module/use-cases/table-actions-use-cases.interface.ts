import { InTransactionEnum } from '../../../../enums/index.js';
import { FoundTableActionDTO } from '../../table-action-rules-module/application/dto/found-action-rules-with-actions-and-events.dto.js';
import { ActivateTableActionDS } from '../application/data-sctructures/activate-table-action.ds.js';
import { ActivateTableActionsDS } from '../application/data-sctructures/activate-table-actions.ds.js';
import {
  ActivatedTableActionDS,
  ActivatedTableActionsDS,
} from '../application/data-sctructures/activated-table-action.ds.js';
import { FindTableActionsDS } from '../application/data-sctructures/find-table-actions.ds.js';
import { FoundTableActionsDS } from '../application/data-sctructures/found-table-actions.ds.js';

export interface IFindAllTableActions {
  execute(inputData: FindTableActionsDS, inTransaction: InTransactionEnum): Promise<FoundTableActionsDS>;
}

export interface IActivateTableAction {
  execute(inputData: ActivateTableActionDS, inTransaction: InTransactionEnum): Promise<ActivatedTableActionDS>;
}

export interface IActivateTableActions {
  execute(inputData: ActivateTableActionsDS, inTransaction: InTransactionEnum): Promise<ActivatedTableActionsDS>;
}

export interface IFindTableAction {
  execute(actionId: string, inTransaction: InTransactionEnum): Promise<FoundTableActionDTO>;
}
