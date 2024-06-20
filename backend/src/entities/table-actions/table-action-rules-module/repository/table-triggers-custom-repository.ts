import { TableActionEntity } from '../../table-actions-module/table-action.entity.js';
import { ActionRulesEntity } from '../action-rules.entity.js';
import { IActionRulesRepository } from './table-triggers-custom-repository.interface.js';

export const actionRulesCustomRepositoryExtension: IActionRulesRepository = {
  async saveNewOrUpdatedTableRules(triggers: ActionRulesEntity): Promise<ActionRulesEntity> {
    return await this.save(triggers);
  },

  async findActionRulesForTableWithTableActions(connectionId: string, tableName: string): Promise<ActionRulesEntity[]> {
    throw new Error('Method not implemented.');
  },

  async findActionRulesWithActionsOnAddRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]> {
    throw new Error('Method not implemented.');
  },

  async findActionRulesFromTriggersOnAddRow(connectionId: string, tableName: string): Promise<TableActionEntity[]> {
    throw new Error('Method not implemented.');
  },

  async findActionRulesWithActionsOnDeleteRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]> {
    throw new Error('Method not implemented.');
  },

  async findActionRulesFromTriggersOnDeleteRow(connectionId: string, tableName: string): Promise<TableActionEntity[]> {
    throw new Error('Method not implemented.');
  },

  async findActionRulesWithActionsOnUpdateRow(connectionId: string, tableName: string): Promise<ActionRulesEntity[]> {
    throw new Error('Method not implemented.');
  },

  async findActionRulesFromTriggersOnUpdateRow(connectionId: string, tableName: string): Promise<TableActionEntity[]> {
    throw new Error('Method not implemented.');
  },
};
