import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { FilterCriteriaEnum } from '../../../enums/filter-criteria.enum.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { validateStringWithEnum } from '../../../helpers/validators/validate-string-with-enum.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { CreateTableFilterDs } from '../application/data-structures/create-table-filters.ds.js';
import { CreatedTableFilterRO } from '../application/response-objects/created-table-filters.ro.js';
import { buildCreatedTableFilterRO } from '../utils/build-created-table-filters-response-object.util.js';
import { buildNewTableFiltersEntity } from '../utils/build-new-table-filters-entity.util.js';
import { ICreateTableFilters } from './table-filters-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateTableFiltersUseCase
  extends AbstractUseCase<CreateTableFilterDs, CreatedTableFilterRO>
  implements ICreateTableFilters
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreateTableFilterDs): Promise<CreatedTableFilterRO> {
    const { connection_id, masterPwd } = inputData;

    const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connection_id,
      masterPwd,
    );
    if (foundConnection.is_frozen) {
      throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
    }

    const errors = await this.validateFiltersData(inputData, foundConnection);
    if (errors.length > 0) {
      throw new BadRequestException(errors.join(',\n'));
    }

    const newTableFilters = buildNewTableFiltersEntity(inputData);

    const savedTableFilters = await this._dbContext.tableFiltersRepository.save(newTableFilters);
    return buildCreatedTableFilterRO(savedTableFilters);
  }

  private async validateFiltersData(
    inputData: CreateTableFilterDs,
    foundConnection: ConnectionEntity,
  ): Promise<Array<string>> {
    const { table_name, filters, dynamic_filtered_column } = inputData;
    const errors: Array<string> = [];
    try {
      const dao = getDataAccessObject(foundConnection);
      const tablesInConnection = await dao.getTablesFromDB();
      const tableNames = tablesInConnection.map((table) => table.tableName);
      if (!tableNames.includes(table_name)) {
        errors.push(Messages.TABLE_NOT_FOUND);
      }
      if (errors.length > 0) {
        return errors;
      }
      const tableStructure = await dao.getTableStructure(table_name, null);
      const tableColumnNames = tableStructure.map((el) => el.column_name);

      for (const column_name in filters) {
        if (!tableColumnNames.includes(column_name)) {
          errors.push(Messages.NO_SUCH_FIELD_IN_TABLE(column_name, table_name));
        }
        // eslint-disable-next-line security/detect-object-injection
        for (const filterCriteria in filters[column_name]) {
          if (!validateStringWithEnum(filterCriteria, FilterCriteriaEnum)) {
            errors.push(`Invalid filter criteria: "${filterCriteria}".`);
          }
        }
      }
      if (dynamic_filtered_column) {
        if (!tableColumnNames.includes(dynamic_filtered_column.column_name)) {
          errors.push(Messages.NO_SUCH_FIELD_IN_TABLE(dynamic_filtered_column.column_name, table_name));
        }
        if (!validateStringWithEnum(dynamic_filtered_column.comparator, FilterCriteriaEnum)) {
          errors.push(`Invalid filter criteria: "${dynamic_filtered_column.comparator}".`);
        }
      }
      return errors;
    } catch (error) {
      throw error;
    }
  }
}
