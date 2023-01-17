import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { toPrettyErrorsMsg } from '../../../helpers/index.js';
import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds.js';
import { FoundTableSettingsDs } from '../application/data-structures/found-table-settings.ds.js';
import { buildFoundTableSettingsDs } from '../utils/build-found-table-settings-ds.js';
import { buildNewTableSettingsEntity } from '../utils/build-new-table-settings-entity.js';
import { IUpdateTableSettings } from './use-cases.interface.js';

@Injectable()
export class UpdateTableSettingsUseCase
  extends AbstractUseCase<CreateTableSettingsDs, FoundTableSettingsDs>
  implements IUpdateTableSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableSettingsDs): Promise<FoundTableSettingsDs> {
    const { connection_id, masterPwd, userId, table_name } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connection_id,
      masterPwd,
    );
    const dao = createDataAccessObject(foundConnection, userId);
    const errors: Array<string> = await dao.validateSettings(inputData, table_name, undefined);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const settingsToUpdate = await this._dbContext.tableSettingsRepository.findTableSettings(connection_id, table_name);
    if (!settingsToUpdate) {
      throw new HttpException(
        {
          message: Messages.TABLE_SETTINGS_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updateTableSettings = buildNewTableSettingsEntity(inputData, foundConnection);
    const updated = Object.assign(settingsToUpdate, updateTableSettings);
    const savedTableSettings = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(updated);
    return buildFoundTableSettingsDs(savedTableSettings);
  }
}
