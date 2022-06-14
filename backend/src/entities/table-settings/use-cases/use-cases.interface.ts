import { FindTableSettingsDs } from '../application/data-structures/find-table-settings.ds';
import { FoundTableSettingsDs } from '../application/data-structures/found-table-settings.ds';
import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds';
import { DeleteTableSettingsDs } from '../application/data-structures/delete-table-settings.ds';

export interface IFindTableSettings {
  execute(inputData: FindTableSettingsDs): Promise<FoundTableSettingsDs>;
}

export interface ICreateTableSettings {
  execute(inputData: CreateTableSettingsDs): Promise<FoundTableSettingsDs>;
}

export interface IUpdateTableSettings {
  execute(inputData: CreateTableSettingsDs): Promise<FoundTableSettingsDs>;
}

export interface IDeleteTableSettings {
  execute(inputData: DeleteTableSettingsDs): Promise<FoundTableSettingsDs>;
}
