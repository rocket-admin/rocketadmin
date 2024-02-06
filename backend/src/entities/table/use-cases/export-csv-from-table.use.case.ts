import { HttpException, HttpStatus, Inject, StreamableFile } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds.js';
import { IExportCSVFromTable } from './table-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { findFilteringFieldsUtil } from '../utils/find-filtering-fields.util.js';
import { findOrderingFieldUtil } from '../utils/find-ordering-field.util.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { hexToBinary, isBinary } from '../../../helpers/binary-to-hex.js';
import { isHexString } from '../utils/is-hex-string.js';
import * as csv from 'csv';

export class ExportCSVFromTableUseCase extends AbstractUseCase<GetTableRowsDs, any> implements IExportCSVFromTable {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private amplitudeService: AmplitudeService,
    private tableLogsService: TableLogsService,
  ) {
    super();
  }

  protected async implementation(inputData: GetTableRowsDs): Promise<StreamableFile> {
    // eslint-disable-next-line prefer-const
    let { connectionId, masterPwd, page, perPage, query, searchingFieldValue, tableName, userId } = inputData;
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
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

      const filteringFields = findFilteringFieldsUtil(query, tableStructure);
      const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings);

      if (orderingField) {
        tableSettings.ordering_field = orderingField.field;
        tableSettings.ordering = orderingField.value;
      }

      if (isHexString(searchingFieldValue)) {
        searchingFieldValue = hexToBinary(searchingFieldValue) as any;
        const binaryFields = [];
        for (const field of tableStructure) {
          if (isBinary(field.data_type)) {
            binaryFields.push(field.column_name);
          }
        }
        tableSettings.search_fields = binaryFields;
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
      if (connection.type === 'oracledb' || 'ibmdb2' || isConnectionTypeAgent(connection.type)) {
        return new StreamableFile(csv.stringify(rowsStream as any, { header: true }));
      }
      return new StreamableFile(rowsStream.pipe(csv.stringify({ header: true })));
    } catch (error) {
      throw new HttpException(
        {
          message: Messages.CSV_EXPORT_FAILED,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
