import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { FoundTableSettingsDs } from '../../table-settings/application/data-structures/found-table-settings.ds.js';
import { buildFoundTableSettingsDs } from '../../table-settings/utils/build-found-table-settings-ds.js';
import { DeleteCustomFieldsDs } from '../application/data-structures/delete-custom-fields.ds.js';
import { IDeleteCustomField } from './custom-field-use-cases.interface.js';

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
