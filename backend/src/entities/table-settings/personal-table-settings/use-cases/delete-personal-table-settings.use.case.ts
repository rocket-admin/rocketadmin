import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FindPersonalTableSettingsDs } from '../data-structures/find-personal-table-settings.ds.js';
import { FoundPersonalTableSettingsDto } from '../dto/found-personal-table-settings.dto.js';
import { IDeletePersonalTableSettings } from './personal-table-settings.use-cases.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { buildFoundTableSettingsDto } from '../utils/build-found-table-settings-dto.js';

@Injectable({ scope: Scope.REQUEST })
export class DeletePersonalTableSettingsUseCase
  extends AbstractUseCase<FindPersonalTableSettingsDs, FoundPersonalTableSettingsDto>
  implements IDeletePersonalTableSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(inputData: FindPersonalTableSettingsDs): Promise<FoundPersonalTableSettingsDto> {
    const { connectionId, userId, tableName } = inputData;

    const foundPersonalTableSettings = await this._dbContext.personalTableSettingsRepository.findUserTableSettings(
      connectionId,
      tableName,
      userId,
    );

    if (foundPersonalTableSettings) {
      await this._dbContext.personalTableSettingsRepository.remove(foundPersonalTableSettings);
    }

    return buildFoundTableSettingsDto(foundPersonalTableSettings);
  }
}
