import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { ICreateTableSettings } from './use-cases.interface';
import { CreateTableSettingsDs } from '../application/data-structures/create-table-settings.ds';
import { FoundTableSettingsDs } from '../application/data-structures/found-table-settings.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { toPrettyErrorsMsg } from '../../../helpers';
import { buildNewTableSettingsEntity } from '../utils/build-new-table-settings-entity';
import { buildFoundTableSettingsDs } from '../utils/build-found-table-settings-ds';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';

@Injectable()
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
    const newTableSettingEntity = buildNewTableSettingsEntity(inputData, foundConnection);
    const savedTableSettings = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(
      newTableSettingEntity,
    );
    return buildFoundTableSettingsDs(savedTableSettings);
  }
}
