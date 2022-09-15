import { EntityRepository, QueryRunner, Repository } from 'typeorm';
import { TableWidgetEntity } from '../table-widget.entity';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { ITableWidgetsRepository } from './table-widgets-repository.interface';

@EntityRepository(TableWidgetEntity)
export class TableWidgetsRepository extends Repository<TableWidgetEntity> implements ITableWidgetsRepository {
  constructor() {
    super();
  }

  public async findTableWidgets(connectionId: string, tableName: string): Promise<Array<TableWidgetEntity>> {
    const qb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('tableSettings')
      .from(TableSettingsEntity, 'tableSettings')
      .leftJoinAndSelect('tableSettings.table_widgets', 'table_widgets');
    qb.where('tableSettings.connection_id = :connection_id', { connection_id: connectionId });
    qb.andWhere('tableSettings.table_name = :table_name', { table_name: tableName });
    const result = await qb.getOne();
    return result?.table_widgets ? result?.table_widgets : [];
  }

  public async saveNewOrUpdatedTableWidget(widget: TableWidgetEntity): Promise<TableWidgetEntity> {
    return await this.save(widget);
  }

  public async removeTableWidget(widget: TableWidgetEntity): Promise<TableWidgetEntity> {
    return await this.remove(widget);
  }

  private getCurrentQueryRunner(): QueryRunner {
    return this.manager.queryRunner;
  }
}
