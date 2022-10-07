import { HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IDeleteCustomField } from './custom-field-use-cases.interface';
import { DeleteCustomFieldsDs } from '../application/data-structures/delete-custom-fields.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { Messages } from '../../../exceptions/text/messages';
import { buildFoundTableSettingsDs } from '../../table-settings/utils/build-found-table-settings-ds';
import { FoundTableSettingsDs } from '../../table-settings/application/data-structures/found-table-settings.ds';

@Injectable()
export class DeleteCustomFieldUseCase
  extends AbstractUseCase<DeleteCustomFieldsDs, FoundTableSettingsDs>
  implements IDeleteCustomField
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: DeleteCustomFieldsDs): Promise<FoundTableSettingsDs> {
    const { connectionId, tableName, fieldId } = inputData;
    const fieldToDelete = await this._dbContext.customFieldsRepository.findCustomFieldById(fieldId);
    if (!fieldToDelete) {
      throw new HttpException(
        {
          message: Messages.CUSTOM_FIELD_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const tableSettingsToUpdate = await this._dbContext.tableSettingsRepository.findTableSettingsWithCustomFields(
      connectionId,
      tableName,
    );
    if (!tableSettingsToUpdate) {
      throw new HttpException(
        {
          message: Messages.TABLE_SETTINGS_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const delIndex = tableSettingsToUpdate.custom_fields.findIndex((field) => field.id === fieldId);
    tableSettingsToUpdate.custom_fields.splice(delIndex, 1);
    await this._dbContext.customFieldsRepository.removeCustomFieldsEntity(fieldToDelete);
    const updatedTableSettings = await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(
      tableSettingsToUpdate,
    );
    return buildFoundTableSettingsDs(updatedTableSettings);
  }
}
