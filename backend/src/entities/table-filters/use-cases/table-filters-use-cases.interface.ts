import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateTableFiltersDto } from '../application/data-structures/create-table-filters.ds.js';
import { FindTableFiltersDs } from '../application/data-structures/find-table-filters.ds.js';
import { CreatedTableFiltersRO } from '../application/response-objects/created-table-filters.ro.js';

export interface ICreateTableFilters {
  execute(inputData: CreateTableFiltersDto, inTransaction: InTransactionEnum): Promise<CreatedTableFiltersRO>;
}

export interface IFindTableFilters {
  execute(inputData: FindTableFiltersDs, inTransaction: InTransactionEnum): Promise<CreatedTableFiltersRO>;
}

export interface IDeleteTableFilters {
  execute(inputData: FindTableFiltersDs, inTransaction: InTransactionEnum): Promise<CreatedTableFiltersRO>;
}
