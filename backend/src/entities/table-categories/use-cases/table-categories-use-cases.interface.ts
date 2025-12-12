import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { CreateOrUpdateTableCategoriesDS } from '../data-sctructures/create-or-update-table-categories.ds.js';
import { FoundTableCategoryRo } from '../dto/found-table-category.ro.js';

export interface ICreateTableCategories {
  execute(
    inputData: CreateOrUpdateTableCategoriesDS,
    inTransaction: InTransactionEnum,
  ): Promise<Array<FoundTableCategoryRo>>;
}

export interface IFindTableCategories {
  execute(connectionId: string): Promise<Array<FoundTableCategoryRo>>;
}
