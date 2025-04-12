import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateTableFiltersDto } from '../application/data-structures/create-table-filters.ds.js';
import { CreatedTableFiltersRO } from '../application/response-objects/created-table-filters.ro.js';

export interface ICreateTableFilters {
  execute(inputData: CreateTableFiltersDto, inTransaction: InTransactionEnum): Promise<CreatedTableFiltersRO>;
}
