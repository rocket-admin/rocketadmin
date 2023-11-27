import { Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaveUserSettingsDs } from '../application/data-structures/save-user-settings.ds.js';
import { ISaveUserSettings } from './user-use-cases.interfaces.js';

export class SaveUserSettingsUseCase
  extends AbstractUseCase<SaveUserSettingsDs, SaveUserSettingsDs>
  implements ISaveUserSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: SaveUserSettingsDs): Promise<SaveUserSettingsDs> {
    const { userId, userSettings } = inputData;
    const result = await this._dbContext.userSessionSettingsRepository.createOrUpdateUserSettings(userId, userSettings);
    return {
      userId: result.userId,
      userSettings: result.userSettings,
    };
  }
}
