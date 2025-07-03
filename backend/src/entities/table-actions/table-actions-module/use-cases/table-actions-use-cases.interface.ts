import { InTransactionEnum } from '../../../../enums/index.js';
import { ActivateTableActionsDS } from '../application/data-sctructures/activate-table-actions.ds.js';
import {
  ActivatedTableActionsDS
} from '../application/data-sctructures/activated-table-action.ds.js';

export interface IActivateTableActions {
  execute(inputData: ActivateTableActionsDS, inTransaction: InTransactionEnum): Promise<ActivatedTableActionsDS>;
}

