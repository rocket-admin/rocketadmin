import { HttpException, HttpStatus, Inject, Injectable, StreamableFile } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds.js';
import { IExportCSVFromTable } from './table-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { findFilteringFieldsUtil, parseFilteringFieldsFromBodyData } from '../utils/find-filtering-fields.util.js';
import { findOrderingFieldUtil } from '../utils/find-ordering-field.util.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { hexToBinary, isBinary } from '../../../helpers/binary-to-hex.js';
import { isHexString } from '../utils/is-hex-string.js';
import * as csv from 'csv';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { FilteringFieldsDs } from '../table-datastructures.js';
import { NonAvailableInFreePlanException } from '../../../exceptions/custom-exceptions/non-available-in-free-plan-exception.js';
import { slackPostMessage } from '../../../helpers/index.js';

@Injectable()
export class ExportCSVFromTableUseCase
  extends AbstractUseCase<GetTableRowsDs, StreamableFile>
  implements IExportCSVFromTable
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetTableRowsDs): Promise<StreamableFile> {
    // eslint-disable-next-line prefer-const
    let { connectionId, masterPwd, page, perPage, query, searchingFieldValue, tableName, userId, filters } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
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

    try {
      const dao = getDataAccessObject(connection);

      let userEmail: string;
      if (isConnectionTypeAgent(connection.type)) {
        userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
      }

      // eslint-disable-next-line prefer-const
      let [tableSettings, tableStructure] = await Promise.all([
        this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
        dao.getTableStructure(tableName, userEmail),
      ]);
      if (!tableSettings) {
        tableSettings = {} as any;
      }

      if (tableSettings.allow_csv_export === false) {
        throw new HttpException(
          {
            message: Messages.CSV_EXPORT_DISABLED,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const filteringFields: Array<FilteringFieldsDs> = isObjectEmpty(filters)
        ? findFilteringFieldsUtil(query, tableStructure)
        : parseFilteringFieldsFromBodyData(filters, tableStructure);

      const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings);

      if (orderingField) {
        tableSettings.ordering_field = orderingField.field;
        tableSettings.ordering = orderingField.value;
      }

      if (isHexString(searchingFieldValue)) {
        searchingFieldValue = hexToBinary(searchingFieldValue) as any;
        tableSettings.search_fields = tableStructure
          .filter((field) => isBinary(field.data_type))
          .map((field) => field.column_name);
      }

      const rowsStream = await dao.getTableRowsStream(
        tableName,
        tableSettings,
        page,
        perPage,
        searchingFieldValue,
        filteringFields,
      );

      //todo: rework as streams when node oracle driver will support it correctly
      //todo: agent return data as array of table rows, not as stream, because we cant
      //todo: transfer data as a stream from clint to server
      if (
        connection.type === 'oracledb' ||
        connection.type === 'ibmdb2' ||
        connection.type === 'mongodb' ||
        connection.type === 'dynamodb' ||
        connection.type === 'elasticsearch' ||
        connection.type === 'redis' ||
        isConnectionTypeAgent(connection.type)
      ) {
        return new StreamableFile(csv.stringify(rowsStream as any, { header: true }));
      }
      return new StreamableFile(rowsStream.pipe(csv.stringify({ header: true })));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // todo: temporary debug log
      await slackPostMessage(`
        CSV Export Failed with error: ${error.message}\n
        Connection type: ${connection.type}\n
        SSH Option: ${connection.ssh}\n
        SSL Option: ${connection.ssl}\n
        `);
      throw new HttpException(
        {
          message: Messages.CSV_EXPORT_FAILED,
          originalMessage: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
