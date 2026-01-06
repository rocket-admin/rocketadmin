import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { FindTableSettingsDs } from '../../application/data-structures/find-table-settings.ds.js';
import { FoundTableSettingsDs } from '../../application/data-structures/found-table-settings.ds.js';
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
    const { connectionId, tableName, masterPassword } = inputData;
    const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName);
    if (!tableSettings) {
      return {} as FoundTableSettingsDs;
    }

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPassword,
    );
    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }

    return buildFoundTableSettingsDs(tableSettings);
  }
}
