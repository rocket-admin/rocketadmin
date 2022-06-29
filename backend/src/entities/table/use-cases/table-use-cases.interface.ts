import { FindTablesDs } from '../application/data-structures/find-tables.ds';
import { FoundTableDs } from '../application/data-structures/found-table.ds';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds';
import { FoundTableRowsDs } from '../application/data-structures/found-table-rows.ds';
import { IStructureRO, ITableRowRO } from '../table.interface';
import { GetTableStructureDs } from '../application/data-structures/get-table-structure-ds';
import { AddRowInTableDs } from '../application/data-structures/add-row-in-table.ds';
import { UpdateRowInTableDs } from '../application/data-structures/update-row-in-table.ds';
import { DeletedRowFromTableDs } from '../application/data-structures/deleted-row-from-table.ds';
import { DeleteRowFromTableDs } from '../application/data-structures/delete-row-from-table.ds';
import { GetRowByPrimaryKeyDs } from '../application/data-structures/get-row-by-primary-key.ds';

export interface IFindTablesInConnection {
  execute(inputData: FindTablesDs): Promise<Array<FoundTableDs>>;
}

export interface IGetTableRows {
  execute(inputData: GetTableRowsDs): Promise<FoundTableRowsDs>;
}

export interface IGetTableStructure {
  execute(inputData: GetTableStructureDs): Promise<IStructureRO>;
}

export interface IAddRowInTable {
  execute(inputData: AddRowInTableDs): Promise<ITableRowRO>;
}

export interface IUpdateRowInTable {
  execute(inputData: UpdateRowInTableDs): Promise<ITableRowRO>;
}

export interface IDeleteRowFromTable {
  execute(inputData: DeleteRowFromTableDs): Promise<DeletedRowFromTableDs>;
}

export interface IGetRowByPrimaryKey {
  execute(inputData: GetRowByPrimaryKeyDs): Promise<ITableRowRO>;
}
