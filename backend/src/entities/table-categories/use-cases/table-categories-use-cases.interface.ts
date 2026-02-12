import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { FindTablesDs } from '../../table/application/data-structures/find-tables.ds.js';
import { CreateOrUpdateTableCategoriesDS } from '../data-sctructures/create-or-update-table-categories.ds.js';
import { FoundTableCategoriesWithTablesRo } from '../dto/found-table-categories-with-tables.ro.js';
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

export interface IFindTableCategoriesWithTables {
	execute(inputData: FindTablesDs): Promise<Array<FoundTableCategoriesWithTablesRo>>;
}
