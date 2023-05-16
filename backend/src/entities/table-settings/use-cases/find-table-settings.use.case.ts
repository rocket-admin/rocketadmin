import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FindTableSettingsDs } from '../application/data-structures/find-table-settings.ds.js';
import { FoundTableSettingsDs } from '../application/data-structures/found-table-settings.ds.js';
import { buildFoundTableSettingsDs } from '../utils/build-found-table-settings-ds.js';
import { IFindTableSettings } from './use-cases.interface.js';

@Injectable()
export class FindTableSettingsUseCase
  extends AbstractUseCase<FindTableSettingsDs, FoundTableSettingsDs>
  implements IFindTableSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }
  protected async implementation(inputData: FindTableSettingsDs): Promise<FoundTableSettingsDs> {
    const { connectionId, tableName } = inputData;
    const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName);
    if (!tableSettings) {
      return {} as FoundTableSettingsDs;
    }
    return buildFoundTableSettingsDs(tableSettings);
  }
}
