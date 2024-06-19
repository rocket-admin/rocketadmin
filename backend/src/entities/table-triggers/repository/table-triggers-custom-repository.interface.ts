import { TableActionEntity } from '../../table-actions/table-action.entity.js';
import { ActionRulesEntity } from '../action-rules.entity.js';

export interface IActionRulesRepository {
  saveNewOrUpdatedTriggers(triggers: ActionRulesEntity): Promise<ActionRulesEntity>;

  findTriggersForTableWithTableActions(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findTableTriggersWithActionsOnAddRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findTableTriggersWithActionsOnDeleteRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findTableTriggersWithActionsOnUpdateRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findTableActionsFromTriggersOnAddRow(connectionId: string, tableName: string): Promise<TableActionEntity[]>;

  findTableActionsFromTriggersOnDeleteRow(connectionId: string, tableName: string): Promise<TableActionEntity[]>;

  findTableActionsFromTriggersOnUpdateRow(connectionId: string, tableName: string): Promise<TableActionEntity[]>;
}
