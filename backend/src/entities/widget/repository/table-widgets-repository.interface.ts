import { TableWidgetEntity } from '../table-widget.entity.js';

export interface ITableWidgetsRepository {
  findTableWidgets(connectionId: string, tableName: string): Promise<Array<TableWidgetEntity>>;

  saveNewOrUpdatedTableWidget(widget: TableWidgetEntity): Promise<TableWidgetEntity>;

  removeTableWidget(widget: TableWidgetEntity): Promise<TableWidgetEntity>;
}
