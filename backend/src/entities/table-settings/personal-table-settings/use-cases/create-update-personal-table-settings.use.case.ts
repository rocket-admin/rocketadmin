import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { FoundPersonalTableSettingsDto } from '../dto/found-personal-table-settings.dto.js';
import {
  CreatePersonalTableSettingsDs,
  PersonalTableSettingsData,
} from '../data-structures/create-personal-table-settings.ds.js';
import { ICreateUpdatePersonalTableSettings } from './personal-table-settings.use-cases.interface.js';
import { ConnectionEntity } from '../../../connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateUpdatePersonalTableSettingsUseCase
  extends AbstractUseCase<CreatePersonalTableSettingsDs, FoundPersonalTableSettingsDto>
  implements ICreateUpdatePersonalTableSettings
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  public async implementation(
    personalTableSettingsData: CreatePersonalTableSettingsDs,
  ): Promise<FoundPersonalTableSettingsDto> {
    const {
      table_settings_metadata: { connection_id, master_password, table_name, user_id },
      table_settings_data,
    } = personalTableSettingsData;

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connection_id,
      master_password,
    );

    await this.validatePersonalTableSettingsData(table_settings_data, foundConnection, table_name);

    const foundTableSettings = await this._dbContext.personalTableSettingsRepository.findUserTableSettings(
      connection_id,
      table_name,
      user_id,
    );

    const settings =
      foundTableSettings ||
      this._dbContext.personalTableSettingsRepository.create({
        connection_id,
        table_name,
        user_id,
      });

    Object.assign(settings, table_settings_data);
    return await this._dbContext.personalTableSettingsRepository.save(settings);
  }

  private async validatePersonalTableSettingsData(
    settingsData: PersonalTableSettingsData,
    connection: ConnectionEntity,
    tableName: string,
  ): Promise<void> {
    const { columns_view, list_fields, list_per_page, ordering, ordering_field, original_names } = settingsData;
    const dao = getDataAccessObject(connection);
    const tableStructure = await dao.getTableStructure(tableName, null);
    const tableColumnNames = tableStructure.map((col) => col.column_name);
    const errors = [];

    if (columns_view !== null && columns_view !== undefined) {
      const invalidColumns = columns_view.filter((col) => !tableColumnNames.includes(col));
      if (invalidColumns.length > 0) {
        errors.push(`Invalid columns in columns_view: ${invalidColumns.join(', ')}`);
      }
    }

    if (list_fields !== null && list_fields !== undefined) {
      const invalidFields = list_fields.filter((field) => !tableColumnNames.includes(field));
      if (invalidFields.length > 0) {
        errors.push(`Invalid columns in list_fields: ${invalidFields.join(', ')}`);
      }
    }

    if (list_per_page !== null && list_per_page !== undefined) {
      if (typeof list_per_page !== 'number' || list_per_page < 1 || list_per_page > 1000) {
        errors.push('list_per_page must be a number between 1 and 1000');
      }
    }

    if (ordering !== null && ordering !== undefined) {
      const validOrderings = ['ASC', 'DESC'];
      if (!validOrderings.includes(ordering)) {
        errors.push(`ordering must be one of: ${validOrderings.join(', ')}`);
      }
    }

    if (ordering_field !== null && ordering_field !== undefined) {
      if (!tableColumnNames.includes(ordering_field)) {
        errors.push(`Invalid ordering_field: ${ordering_field}`);
      }
    }

    if (original_names !== null && original_names !== undefined) {
      if (typeof original_names !== 'object' || Array.isArray(original_names)) {
        errors.push('original_names must be an object');
      } else {
        const invalidKeys = Object.keys(original_names).filter((key) => !tableColumnNames.includes(key));
        if (invalidKeys.length > 0) {
          errors.push(`Invalid columns in original_names: ${invalidKeys.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Validation failed: ${errors.join('; ')}`);
    }
  }
}
