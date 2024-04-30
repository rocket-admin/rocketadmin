import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IImportCSVFinTable } from './table-use-cases.interface.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ImportCSVInTableDs } from '../application/data-structures/import-scv-in-table.ds.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';

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
    const { file, tableName, connectionId, materPwd } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, materPwd);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const dao = getDataAccessObject(connection);
      await dao.importCSVInTable(file, tableName);
      return true;
    } catch (error) {
      throw new HttpException(
        {
          message: `${Messages.CSV_IMPORT_FAILED}. ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
