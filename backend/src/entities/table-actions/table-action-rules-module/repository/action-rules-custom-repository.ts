import { TableActionEventEnum } from '../../../../enums/table-action-event-enum.js';
import { ActionRulesEntity } from '../action-rules.entity.js';
import { IActionRulesRepository } from './action-rules-custom-repository.interface.js';

export const actionRulesCustomRepositoryExtension: IActionRulesRepository = {
  async saveNewOrUpdatedActionRule(triggers: ActionRulesEntity): Promise<ActionRulesEntity> {
    return await this.save(triggers);
  },

  async findAllFullActionRulesForTableInConnection(
    connectionId: string,
    tableName: string,
  ): Promise<Array<ActionRulesEntity>> {
    return await this.createQueryBuilder('action_rules')
      .leftJoinAndSelect('action_rules.table_actions', 'table_actions')
      .leftJoinAndSelect('action_rules.action_events', 'action_events')
      .leftJoinAndSelect('action_rules.connection', 'connection')
      .where('connection.id = :connectionId', { connectionId })
      .andWhere('action_rules.table_name = :tableName', { tableName })
      .getMany();
  },

  async findOneWithActionsAndEvents(ruleId: string, connectionId: string): Promise<ActionRulesEntity> {
    return await this.createQueryBuilder('action_rules')
      .leftJoinAndSelect('action_rules.table_actions', 'table_actions')
      .leftJoinAndSelect('action_rules.action_events', 'action_events')
      .leftJoinAndSelect('action_rules.connection', 'connection')
      .where('action_rules.id = :ruleId', { ruleId })
      .andWhere('connection.id = :connectionId', { connectionId })
      .getOne();
  },

  async findActionRulesWithCustomEvents(connectionId: string, tableName: string): Promise<Array<ActionRulesEntity>> {
    return await this.createQueryBuilder('action_rules')
      .leftJoinAndSelect('action_rules.table_actions', 'table_actions')
      .leftJoinAndSelect('action_rules.action_events', 'action_events')
      .leftJoinAndSelect('action_rules.connection', 'connection')
      .where('connection.id = :connectionId', { connectionId })
      .andWhere('action_rules.table_name = :tableName', { tableName })
      .andWhere('action_events.event = :event', { event: TableActionEventEnum.CUSTOM })
      .getMany();
  },
};
