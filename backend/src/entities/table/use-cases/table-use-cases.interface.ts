import { InTransactionEnum } from '../../../enums';
import { AddRowInTableDs } from '../application/data-structures/add-row-in-table.ds';
import { DeleteRowFromTableDs, DeleteRowsFromTableDs } from '../application/data-structures/delete-row-from-table.ds';
import { DeletedRowFromTableDs } from '../application/data-structures/deleted-row-from-table.ds';
import { FindTablesDs } from '../application/data-structures/find-tables.ds';
import { FoundTableRowsDs } from '../application/data-structures/found-table-rows.ds';
import { FoundTableDs } from '../application/data-structures/found-table.ds';
import { GetRowByPrimaryKeyDs } from '../application/data-structures/get-row-by-primary-key.ds';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds';
import { GetTableStructureDs } from '../application/data-structures/get-table-structure-ds';
import { UpdateRowInTableDs } from '../application/data-structures/update-row-in-table.ds';
import { IStructureRO, ITableRowRO } from '../table.interface';

export interface IFindTablesInConnection {
  execute(inputData: FindTablesDs, inTransaction: InTransactionEnum): Promise<Array<FoundTableDs>>;
}

export interface IGetTableRows {
  execute(inputData: GetTableRowsDs, inTransaction: InTransactionEnum): Promise<FoundTableRowsDs>;
}

export interface IGetTableStructure {
  execute(inputData: GetTableStructureDs, inTransaction: InTransactionEnum): Promise<IStructureRO>;
}

export interface IAddRowInTable {
  execute(inputData: AddRowInTableDs, inTransaction: InTransactionEnum): Promise<ITableRowRO>;
}

export interface IUpdateRowInTable {
  execute(inputData: UpdateRowInTableDs, inTransaction: InTransactionEnum): Promise<ITableRowRO>;
}

export interface IDeleteRowFromTable {
  execute(inputData: DeleteRowFromTableDs, inTransaction: InTransactionEnum): Promise<DeletedRowFromTableDs>;
}

export interface IDeleteRowsFromTable {
  execute(inputData: DeleteRowsFromTableDs, inTransaction: InTransactionEnum): Promise<boolean>;
}

export interface IGetRowByPrimaryKey {
  execute(inputData: GetRowByPrimaryKeyDs, inTransaction: InTransactionEnum): Promise<ITableRowRO>;
}
