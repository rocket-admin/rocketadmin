import { TableCategoriesEntity } from '../table-categories.entity.js';
import { ITableCategoriesCustomRepository } from './table-categories-repository.interface.js';

export const tableCategoriesCustomRepositoryExtension: ITableCategoriesCustomRepository = {
  async findTableCategoriesForConnection(connectionId: string): Promise<Array<TableCategoriesEntity>> {
    return this.createQueryBuilder('table_categories')
      .leftJoin('table_categories.connection_properties', 'connection_properties')
      .leftJoin('connection_properties.connection', 'connection')
      .where('connection.id = :connectionId', { connectionId: connectionId })
      .getMany();
  },
};
