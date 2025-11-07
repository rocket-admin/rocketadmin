import { InTransactionEnum } from '../../../../enums/in-transaction.enum.js';
import { FindPersonalTableSettingsDs } from '../data-structures/find-personal-table-settings.ds.js';
import { FoundPersonalTableSettingsDto } from '../dto/found-personal-table-settings.dto.js';

export interface IFindPersonalTableSettings {
  execute(
    inputData: FindPersonalTableSettingsDs,
    inTransaction: InTransactionEnum,
  ): Promise<FoundPersonalTableSettingsDto>;
}

export interface ICreatePersonalTableSettings {}

export interface IUpdatePersonalTableSettings {}

export interface IDeletePersonalTableSettings {}
