import { TableCategoriesEntity } from '../table-categories.entity.js';

export interface ITableCategoriesCustomRepository {
  findTableCategoriesForConnection(connectionId: string): Promise<Array<TableCategoriesEntity>>;
}
