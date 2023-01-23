import { TableSettingsEntity } from '../../table-settings/table-settings.entity.js';
import { TableWidgetEntity } from '../table-widget.entity.js';

export const tableWidgetsCustomRepositoryExtension = {
  async findTableWidgets(connectionId: string, tableName: string): Promise<Array<TableWidgetEntity>> {
    const qb = this.manager
      .getRepository(TableSettingsEntity)
      .createQueryBuilder('tableSettings')
      .leftJoinAndSelect('tableSettings.table_widgets', 'table_widgets');
    qb.where('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    const result = await qb.getOne();
    return result?.table_widgets ? result?.table_widgets : [];
  },

  async saveNewOrUpdatedTableWidget(widget: TableWidgetEntity): Promise<TableWidgetEntity> {
    return await this.save(widget);
  },

  async removeTableWidget(widget: TableWidgetEntity): Promise<TableWidgetEntity> {
    return await this.remove(widget);
  },
};
