import { InTransactionEnum } from '../../../../enums/index.js';
import { CreateTableSettingsDs } from '../../application/data-structures/create-table-settings.ds.js';
import { DeleteTableSettingsDs } from '../../application/data-structures/delete-table-settings.ds.js';
import { FindTableSettingsDs } from '../../application/data-structures/find-table-settings.ds.js';
import { FoundTableSettingsDs } from '../../application/data-structures/found-table-settings.ds.js';

export interface IFindTableSettings {
  execute(inputData: FindTableSettingsDs, inTransaction: InTransactionEnum): Promise<FoundTableSettingsDs>;
}

export interface ICreateTableSettings {
  execute(inputData: CreateTableSettingsDs, inTransaction: InTransactionEnum): Promise<FoundTableSettingsDs>;
}

export interface IUpdateTableSettings {
  execute(inputData: CreateTableSettingsDs, inTransaction: InTransactionEnum): Promise<FoundTableSettingsDs>;
}

export interface IDeleteTableSettings {
  execute(inputData: DeleteTableSettingsDs, inTransaction: InTransactionEnum): Promise<FoundTableSettingsDs>;
}
