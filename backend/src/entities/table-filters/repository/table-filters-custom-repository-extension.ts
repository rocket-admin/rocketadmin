import { TableFiltersEntity } from '../table-filters.entity.js';
import { ITableFiltersCustomRepository } from './table-filters-custom-repository.interface.js';

export const tableFiltersCustomRepositoryExtension: ITableFiltersCustomRepository = {
  async findTableFiltersForTableInConnection(tableName: string, connectionId: string): Promise<TableFiltersEntity> {
    const qb = this.createQueryBuilder('table_filters')
      .leftJoin('table_filters.connection', 'connection')
      .where('table_filters.table_name = :tableName', { tableName: tableName })
      .andWhere('connection.id = :connectionId', { connectionId: connectionId });
    return await qb.getOne();
  },
};
