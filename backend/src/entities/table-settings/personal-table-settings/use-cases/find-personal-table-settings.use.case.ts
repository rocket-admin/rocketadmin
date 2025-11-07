import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FoundPersonalTableSettingsDto } from '../dto/found-personal-table-settings.dto.js';
import { FindPersonalTableSettingsDs } from '../data-structures/find-personal-table-settings.ds.js';
import { IFindPersonalTableSettings } from './personal-table-settings.use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { buildFoundTableSettingsDto } from '../utils/build-found-table-settings-dto.js';

@Injectable()
export class FindPersonalTableSettingsUseCase
  extends AbstractUseCase<FindPersonalTableSettingsDs, FoundPersonalTableSettingsDto>
  implements IFindPersonalTableSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindPersonalTableSettingsDs): Promise<FoundPersonalTableSettingsDto> {
    const { connectionId, userId, tableName, masterPassword } = inputData;

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPassword,
    );

    if (!foundConnection) {
      throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
    }

    const foundPersonalTableSettings = await this._dbContext.personalTableSettingsRepository.findUserTableSettings(
      connectionId,
      tableName,
      userId,
    );

    if (!foundPersonalTableSettings) {
      throw new NotFoundException(Messages.PERSONAL_TABLE_SETTINGS_NOT_FOUND);
    }

    return buildFoundTableSettingsDto(foundPersonalTableSettings);
  }
}
