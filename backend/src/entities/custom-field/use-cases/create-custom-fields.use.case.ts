import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { ICreateCustomFields } from './custom-field-use-cases.interface';
import { CreateCustomFieldsDs } from '../application/data-structures/create-custom-fields.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { CreateTableSettingsDs } from '../../table-settings/application/data-structures/create-table-settings.ds';
import { buildEmptyTableSettings } from '../../table-settings/utils/build-empty-table-settings';
import { buildNewCustomFieldsEntity } from '../utils/build-new-custom-fields-entity';
import { buildFoundTableSettingsDs } from '../../table-settings/utils/build-found-table-settings-ds';
import { validateCreateCustomFieldDto } from '../utils/validate-create-custom-field-dto';
import { FoundTableSettingsDs } from '../../table-settings/application/data-structures/found-table-settings.ds';

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
