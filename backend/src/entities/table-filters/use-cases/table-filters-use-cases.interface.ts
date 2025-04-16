import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { CreateTableFilterDs } from '../application/data-structures/create-table-filters.ds.js';
import { FindTableFilterByIdDs, FindTableFiltersDs } from '../application/data-structures/find-table-filters.ds.js';
import { UpdateTableFilterDs } from '../application/data-structures/update-table-filters.ds.js';
import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';

export interface ICreateTableFilters {
  execute(inputData: CreateTableFilterDs, inTransaction: InTransactionEnum): Promise<CreatedTableFilterRO>;
}

export interface IFindTableFilters {
  execute(inputData: FindTableFiltersDs, inTransaction: InTransactionEnum): Promise<Array<CreatedTableFilterRO>>;
}

export interface IFindTableFilterById {
  execute(inputData: FindTableFilterByIdDs, inTransaction: InTransactionEnum): Promise<CreatedTableFilterRO>;
}

export interface IDeleteTableFilters {
  execute(inputData: FindTableFiltersDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IDeleteTableFilterById {
  execute(inputData: FindTableFilterByIdDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IUpdateTableFilterById {
  execute(inputData: UpdateTableFilterDs, inTransaction: InTransactionEnum): Promise<CreatedTableFilterRO>;
}
