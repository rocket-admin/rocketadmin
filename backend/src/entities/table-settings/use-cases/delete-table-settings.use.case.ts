import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { IDeleteTableSettings } from './use-cases.interface';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { DeleteTableSettingsDs } from '../application/data-structures/delete-table-settings.ds';
import { FoundTableSettingsDs } from '../application/data-structures/found-table-settings.ds';
import { buildFoundTableSettingsDs } from '../utils/build-found-table-settings-ds';
import AbstractUseCase from '../../../common/abstract-use.case';
import { Messages } from '../../../exceptions/text/messages';

@Injectable({ scope: Scope.REQUEST })
export class DeleteTableSettingsUseCase
  extends AbstractUseCase<DeleteTableSettingsDs, FoundTableSettingsDs>
  implements IDeleteTableSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteTableSettingsDs): Promise<FoundTableSettingsDs> {
    const { connectionId, tableName } = inputData;
    const tableSettingsToDelete = await this._dbContext.tableSettingsRepository.findTableSettings(
      connectionId,
      tableName,
    );
    if (!tableSettingsToDelete) {
      throw new HttpException(
        {
          message: Messages.TABLE_SETTINGS_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const deletedSettings = await this._dbContext.tableSettingsRepository.removeTableSettings(tableSettingsToDelete);
    return buildFoundTableSettingsDs(deletedSettings);
  }
}
