import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IImportCSVFinTable } from './table-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ImportCSVInTableDs } from '../application/data-structures/import-scv-in-table.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/src/data-access-layer/shared/create-data-access-object.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';

@Injectable()
export class ImportCSVInTableUseCase
  extends AbstractUseCase<ImportCSVInTableDs, boolean>
  implements IImportCSVFinTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: ImportCSVInTableDs): Promise<boolean> {
    const { file, tableName, connectionId, materPwd, userId } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, materPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (connection.is_frozen) {
      throw new NonAvailableInFreePlanException(Messages.CONNECTION_IS_FROZEN);
    }

    if (connection.isTestConnection) {
      throw new HttpException(
        {
          message: Messages.CSV_IMPORT_DISABLED_FOR_TEST_CONNECTIONS,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const foundTableSettings = await this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName);

    if (foundTableSettings?.allow_csv_import === false) {
      throw new HttpException(
        {
          message: Messages.CSV_IMPORT_DISABLED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const dao = getDataAccessObject(connection);
      let userEmail: string;
      if (isConnectionTypeAgent(connection.type)) {
        userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
      }
      await dao.importCSVInTable(file, tableName, userEmail);
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: `${Messages.CSV_IMPORT_FAILED}. ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
