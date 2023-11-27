import { Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { SaveUserSettingsDs } from '../application/data-structures/save-user-settings.ds.js';
import { IGetUserSettings } from './user-use-cases.interfaces.js';

export class GetUserSessionSettingsUseCase
  extends AbstractUseCase<string, SaveUserSettingsDs>
  implements IGetUserSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<SaveUserSettingsDs> {
    const result = await this._dbContext.userSessionSettingsRepository.getUserSettingsByUserId(userId);
    return {
      userId: userId,
      userSettings: result?.userSettings ? result.userSettings : null,
    };
  }
}
