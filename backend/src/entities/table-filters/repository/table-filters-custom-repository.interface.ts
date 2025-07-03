import { TableFiltersEntity } from '../table-filters.entity.js';

export interface ITableFiltersCustomRepository {
  findTableFiltersForTableInConnection(tableName: string, connectionId: string): Promise<Array<TableFiltersEntity>>;

  findTableFiltersByIdAndConnectionId(filterId: string, connectionId: string): Promise<TableFiltersEntity>;
}
