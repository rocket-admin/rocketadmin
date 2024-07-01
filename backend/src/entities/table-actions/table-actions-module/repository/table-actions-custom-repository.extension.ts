import { TableActionEntity } from '../table-action.entity.js';
import { ITableActionRepository } from './table-action-custom-repository.interface.js';

export const tableActionsCustomRepositoryExtension: ITableActionRepository = {
  async saveNewOrUpdatedTableAction(action: TableActionEntity): Promise<TableActionEntity> {
    return await this.save(action);
  },

  async findTableActionsWithRulesAndEvents(connectionId: string, tableName: string): Promise<Array<TableActionEntity>> {
    const qb = this.createQueryBuilder('table_actions')
      .leftJoinAndSelect('table_actions.action_rule', 'action_rule')
      .leftJoinAndSelect('action_rule.connection', 'connection')
      .leftJoinAndSelect('action_rule.action_events', 'action_events')
      .leftJoinAndSelect('table_actions.settings', 'table_settings')
      .where('connection.id = :connectionId', { connectionId })
      .andWhere('action_rule.table_name = :tableName', { tableName });
    return await qb.getMany();
  },

  async findTableActionById(actionId: string): Promise<TableActionEntity> {
    return await this.findOne({ where: { id: actionId } });
  },

  async findFullTableActionById(actionId: string): Promise<TableActionEntity> {
    const qb = this.createQueryBuilder('table_actions')
      .leftJoinAndSelect('table_actions.action_rules', 'action_rules')
      .leftJoinAndSelect('action_rules.action_events', 'action_events')
      .leftJoinAndSelect('table_actions.settings', 'table_settings')
      .where('table_actions.id = :id', { id: actionId });
    return await qb.getOne();
  },

  async deleteTableAction(action: TableActionEntity): Promise<TableActionEntity> {
    await this.createQueryBuilder('table_actions')
      .delete()
      .from(TableActionEntity)
      .where('id = :id', { id: action.id })
      .execute();
    return action;
  },

  async findTableActionsByIds(actionIds: Array<string>): Promise<Array<TableActionEntity>> {
    const qb = this.createQueryBuilder('table_actions').where('table_actions.id IN (:...actionIds)', { actionIds });
    return await qb.getMany();
  },
};
