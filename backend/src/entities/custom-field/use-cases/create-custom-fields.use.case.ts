import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CreateTableSettingsDs } from '../../table-settings/application/data-structures/create-table-settings.ds.js';
import { FoundTableSettingsDs } from '../../table-settings/application/data-structures/found-table-settings.ds.js';
import { TableSettingsEntity } from '../../table-settings/common-table-settings/table-settings.entity.js';
import { buildEmptyTableSettings } from '../../table-settings/common-table-settings/utils/build-empty-table-settings.js';
import { buildFoundTableSettingsDs } from '../../table-settings/common-table-settings/utils/build-found-table-settings-ds.js';
import { CreateCustomFieldsDs } from '../application/data-structures/create-custom-fields.ds.js';
import { buildNewCustomFieldsEntity } from '../utils/build-new-custom-fields-entity.js';
import { validateCreateCustomFieldDto } from '../utils/validate-create-custom-field-dto.js';
import { ICreateCustomFields } from './custom-field-use-cases.interface.js';

@Injectable()
export class CreateCustomFieldsUseCase
  extends AbstractUseCase<CreateCustomFieldsDs, FoundTableSettingsDs>
  implements ICreateCustomFields
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateCustomFieldsDs): Promise<FoundTableSettingsDs> {
    const { connectionId, tableName, masterPwd, createFieldDto, userId } = inputData;
    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    await validateCreateCustomFieldDto(createFieldDto, foundConnection, userId, tableName);
    const foundTableSettingToUpdate: TableSettingsEntity =
      await this._dbContext.tableSettingsRepository.findTableSettingsWithCustomFields(connectionId, tableName);
    const newCustomFieldEntity = buildNewCustomFieldsEntity(inputData);
    const savedCustomFields = await this._dbContext.customFieldsRepository.saveCustomFieldsEntity(newCustomFieldEntity);
    if (foundTableSettingToUpdate) {
      if (Array.isArray(foundTableSettingToUpdate.custom_fields)) {
        foundTableSettingToUpdate.custom_fields.push(savedCustomFields);
      } else {
        foundTableSettingToUpdate.custom_fields = [savedCustomFields];
      }
      const savedSettings = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(
        foundTableSettingToUpdate,
      );
      return buildFoundTableSettingsDs(savedSettings);
    }
    const emptyTableSettings: CreateTableSettingsDs = buildEmptyTableSettings(connectionId, tableName);
    const savedTableSettings = await this._dbContext.tableSettingsRepository.createNewTableSettings(emptyTableSettings);
    savedTableSettings.custom_fields = [savedCustomFields];
    const savedSettings = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(savedTableSettings);
    return buildFoundTableSettingsDs(savedSettings);
  }
}
