import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { TableActionEntity } from '../table-action.entity.js';
import { ITableActionRepository } from './table-action-custom-repository.interface.js';

export const tableActionsCustomRepositoryExtension: ITableActionRepository = {
  async saveNewOrUpdatedTableAction(action: TableActionEntity): Promise<TableActionEntity> {
    return await this.save(action);
  },

  async findTableActions(connectionId: string, tableName: string): Promise<Array<TableActionEntity>> {
    const qb = this.manager
      .getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.table_actions', 'table_actions');
    qb.where('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    const result = await qb.getOne();
    return result?.table_actions ? result.table_actions : [];
  },

  async findTableActionById(actionId: string): Promise<TableActionEntity> {
    return await this.findOne({ where: { id: actionId } });
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
