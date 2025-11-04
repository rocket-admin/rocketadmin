import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { toPrettyErrorsMsg } from '../../../../helpers/index.js';
import { CreateTableSettingsDs } from '../../application/data-structures/create-table-settings.ds.js';
import { FoundTableSettingsDs } from '../../application/data-structures/found-table-settings.ds.js';
import { buildFoundTableSettingsDs } from '../utils/build-found-table-settings-ds.js';
import { buildNewTableSettingsEntity } from '../utils/build-new-table-settings-entity.js';
import { ICreateTableSettings } from './use-cases.interface.js';
import { ValidateTableSettingsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/validate-table-settings.ds.js';
import { buildValidateTableSettingsDS } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/validate-table-settings-ds.builder.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateTableSettingsUseCase
  extends AbstractUseCase<CreateTableSettingsDs, FoundTableSettingsDs>
  implements ICreateTableSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableSettingsDs): Promise<FoundTableSettingsDs> {
    const { connection_id, masterPwd, table_name } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connection_id,
      masterPwd,
    );
    const dao = getDataAccessObject(foundConnection);
    const tableSettingsDs: ValidateTableSettingsDS = buildValidateTableSettingsDS(inputData);
    const errors: Array<string> = await dao.validateSettings(tableSettingsDs, table_name, undefined);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: toPrettyErrorsMsg(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const newTableSettingEntity = buildNewTableSettingsEntity(inputData, foundConnection);

    const foundTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(
      connection_id,
      table_name,
    );
    if (foundTableSettings) {
      await this._dbContext.tableSettingsRepository.remove(foundTableSettings);
    }

    const savedTableSettings =
      await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(newTableSettingEntity);
    return buildFoundTableSettingsDs(savedTableSettings);
  }
}
