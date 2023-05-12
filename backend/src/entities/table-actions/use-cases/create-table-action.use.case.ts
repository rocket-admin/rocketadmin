import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { buildEmptyTableSettingsWithEmptyWidgets } from '../../table-settings/utils/build-empty-table-settings.js';
import { buildNewTableSettingsEntity } from '../../table-settings/utils/build-new-table-settings-entity.js';
import { CreateTableActionDS } from '../application/data-sctructures/create-table-action.ds.js';
import { CreatedTableActionDS } from '../application/data-sctructures/created-table-action.ds.js';
import { buildCreatedTableActionDS } from '../utils/build-created-table-action-ds.js';
import { buildNewTableActionEntity } from '../utils/build-new-table-action-entity.util.js';
import { ICreateTableAction } from './table-actions-use-cases.interface.js';

@Injectable()
export class CreateTableActionUseCase
  extends AbstractUseCase<CreateTableActionDS, CreatedTableActionDS>
  implements ICreateTableAction
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableActionDS): Promise<CreatedTableActionDS> {
    const { connectionId, masterPwd, tableName, userId } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    if (!foundConnection.signing_key) {
      foundConnection.signing_key = Encryptor.generateRandomString(40);
      await this._dbContext.connectionRepository.saveUpdatedConnection(foundConnection);
    }

    let tableSettingToUpdate = await this._dbContext.tableSettingsRepository.findTableSettingsWithTableActions(
      connectionId,
      tableName,
    );

    if (!tableSettingToUpdate) {
      const emptyTableSettingsDs = buildEmptyTableSettingsWithEmptyWidgets(connectionId, tableName, userId);
      const newTableSettings = buildNewTableSettingsEntity(emptyTableSettingsDs, foundConnection);
      tableSettingToUpdate = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(newTableSettings);
    }

    const newTableAction = buildNewTableActionEntity(inputData);
    const savedTableAction = await this._dbContext.tableActionRepository.saveNewOrUpdatedTableAction(newTableAction);
    tableSettingToUpdate.table_actions.push(savedTableAction);
    await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettingToUpdate);
    return buildCreatedTableActionDS(savedTableAction);
  }
}
