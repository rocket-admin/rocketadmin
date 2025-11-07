import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { CreatePersonalTableSettingsDs } from '../data-structures/create-personal-table-settings.ds.js';
import { FindPersonalTableSettingsDs } from '../data-structures/find-personal-table-settings.ds.js';
import { FoundPersonalTableSettingsDto } from '../dto/found-personal-table-settings.dto.js';

export interface IFindPersonalTableSettings {
  execute(
    inputData: FindPersonalTableSettingsDs,
    inTransaction: InTransactionEnum,
  ): Promise<FoundPersonalTableSettingsDto>;
}

export interface ICreateUpdatePersonalTableSettings {
  execute(
    inputData: CreatePersonalTableSettingsDs,
    inTransaction: InTransactionEnum,
  ): Promise<FoundPersonalTableSettingsDto>;
}

export interface IDeletePersonalTableSettings {
  execute(
    inputData: FindPersonalTableSettingsDs,
    inTransaction: InTransactionEnum,
  ): Promise<FoundPersonalTableSettingsDto>;
}
