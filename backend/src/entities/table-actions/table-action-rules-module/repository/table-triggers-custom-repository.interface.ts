import { TableActionEntity } from '../../table-actions-module/table-action.entity.js';
import { ActionRulesEntity } from '../action-rules.entity.js';

export interface IActionRulesRepository {
  saveNewOrUpdatedTableRules(triggers: ActionRulesEntity): Promise<ActionRulesEntity>;

  findActionRulesForTableWithTableActions(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findActionRulesWithActionsOnAddRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findActionRulesWithActionsOnDeleteRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findActionRulesWithActionsOnUpdateRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]>;

  findActionRulesFromTriggersOnAddRow(connectionId: string, tableName: string): Promise<TableActionEntity[]>;

  findActionRulesFromTriggersOnDeleteRow(connectionId: string, tableName: string): Promise<TableActionEntity[]>;

  findActionRulesFromTriggersOnUpdateRow(connectionId: string, tableName: string): Promise<TableActionEntity[]>;
}
