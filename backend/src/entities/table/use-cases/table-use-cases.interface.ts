import { StreamableFile } from '@nestjs/common';
import { InTransactionEnum } from '../../../enums/index.js';
import { AddRowInTableDs } from '../application/data-structures/add-row-in-table.ds.js';
import {
  DeleteRowFromTableDs,
  DeleteRowsFromTableDs,
} from '../application/data-structures/delete-row-from-table.ds.js';
import { DeletedRowFromTableDs } from '../application/data-structures/deleted-row-from-table.ds.js';
import { FindTablesDs } from '../application/data-structures/find-tables.ds.js';
import { FoundTableRowsDs } from '../application/data-structures/found-table-rows.ds.js';
import { FoundTableDs, FoundTablesWithCategoriesDS } from '../application/data-structures/found-table.ds.js';
import { GetRowByPrimaryKeyDs } from '../application/data-structures/get-row-by-primary-key.ds.js';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds.js';
import { GetTableStructureDs } from '../application/data-structures/get-table-structure-ds.js';
import { UpdateRowInTableDs } from '../application/data-structures/update-row-in-table.ds.js';
import { TableStructureDs, TableRowRODs } from '../table-datastructures.js';
import { UpdateRowsInTableDs } from '../application/data-structures/update-rows-in-table.ds.js';
import { SuccessResponse } from '../../../microservices/saas-microservice/data-structures/common-responce.ds.js';
import { ImportCSVInTableDs } from '../application/data-structures/import-scv-in-table.ds.js';

export interface IFindTablesInConnection {
  execute(inputData: FindTablesDs, inTransaction: InTransactionEnum): Promise<Array<FoundTableDs>>;
}

export interface IFindTablesInConnectionV2 {
  execute(inputData: FindTablesDs, inTransaction: InTransactionEnum): Promise<FoundTablesWithCategoriesDS>;
}

export interface IGetTableRows {
  execute(inputData: GetTableRowsDs, inTransaction: InTransactionEnum): Promise<FoundTableRowsDs>;
}

export interface IGetTableStructure {
  execute(inputData: GetTableStructureDs, inTransaction: InTransactionEnum): Promise<TableStructureDs>;
}

export interface IAddRowInTable {
  execute(inputData: AddRowInTableDs, inTransaction: InTransactionEnum): Promise<TableRowRODs>;
}

export interface IUpdateRowInTable {
  execute(inputData: UpdateRowInTableDs, inTransaction: InTransactionEnum): Promise<TableRowRODs>;
}

export interface IBulkUpdateRowsInTable {
  execute(inputData: UpdateRowsInTableDs, inTransaction: InTransactionEnum): Promise<SuccessResponse>;
}

export interface IDeleteRowFromTable {
  execute(inputData: DeleteRowFromTableDs, inTransaction: InTransactionEnum): Promise<DeletedRowFromTableDs>;
}

export interface IDeleteRowsFromTable {
  execute(inputData: DeleteRowsFromTableDs, inTransaction: InTransactionEnum): Promise<boolean>;
}

export interface IGetRowByPrimaryKey {
  execute(inputData: GetRowByPrimaryKeyDs, inTransaction: InTransactionEnum): Promise<TableRowRODs>;
}

export interface IExportCSVFromTable {
  execute(inputData: GetTableRowsDs, inTransaction: InTransactionEnum): Promise<StreamableFile>;
}

export interface IImportCSVFinTable {
  execute(inputData: ImportCSVInTableDs, inTransaction: InTransactionEnum): Promise<boolean>;
}
