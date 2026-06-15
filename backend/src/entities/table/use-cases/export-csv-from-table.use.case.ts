import { Transform } from 'node:stream';
import { HttpException, HttpStatus, Inject, Injectable, StreamableFile } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import * as csv from 'csv';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { LogOperationTypeEnum } from '../../../enums/log-operation-type.enum.js';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { hexToBinary, isBinary } from '../../../helpers/binary-to-hex.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { slackPostMessage } from '../../../helpers/slack/slack-post-message.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { GetTableRowsDs } from '../application/data-structures/get-table-rows.ds.js';
import { FilteringFieldsDs } from '../table-datastructures.js';
import { buildCommonTableSettingsInput } from '../utils/build-common-table-settings-input.util.js';
import { filterRowByReadableColumns, isAllColumnsReadable } from '../utils/filter-columns-by-read-permission.util.js';
import { findFilteringFieldsUtil, parseFilteringFieldsFromBodyData } from '../utils/find-filtering-fields.util.js';
import { findOrderingFieldUtil } from '../utils/find-ordering-field.util.js';
import { isHexString } from '../utils/is-hex-string.js';
import { getUserEmailForAgent, validateConnection } from '../utils/validate-connection.util.js';
import { IExportCSVFromTable } from './table-use-cases.interface.js';

@Injectable()
export class ExportCSVFromTableUseCase
	extends AbstractUseCase<GetTableRowsDs, StreamableFile>
	implements IExportCSVFromTable
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private tableLogsService: TableLogsService,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: GetTableRowsDs): Promise<StreamableFile> {
		// eslint-disable-next-line prefer-const
		let { connectionId, masterPwd, page, perPage, query, searchingFieldValue, tableName, userId, filters } = inputData;
		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);

		let operationResult = OperationResultStatusEnum.unknown;

		try {
			const dao = getDataAccessObject(connection);

			const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

			// eslint-disable-next-line prefer-const
			let [tableSettings, tableStructure, personalTableSettings] = await Promise.all([
				this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
				dao.getTableStructure(tableName, userEmail),
				this._dbContext.personalTableSettingsRepository.findUserTableSettings(userId, connectionId, tableName),
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
				: parseFilteringFieldsFromBodyData(filters ?? {}, tableStructure);

			const orderingField = findOrderingFieldUtil(query, tableStructure, tableSettings);

			const builtDAOsTableSettings = buildDAOsTableSettingsDs(
				buildCommonTableSettingsInput(tableSettings),
				personalTableSettings,
			);

			if (orderingField) {
				builtDAOsTableSettings.ordering_field = orderingField.field;
				builtDAOsTableSettings.ordering = orderingField.value;
			}

			if (isHexString(searchingFieldValue)) {
				searchingFieldValue = hexToBinary(searchingFieldValue) as any;
				tableSettings.search_fields = tableStructure
					.filter((field) => isBinary(field.data_type))
					.map((field) => field.column_name);
			}

			const rowsStream = await dao.getTableRowsStream(
				tableName,
				builtDAOsTableSettings,
				page,
				perPage,
				searchingFieldValue,
				filteringFields,
			);

			operationResult = OperationResultStatusEnum.successfully;

			// Column-level read permission (the ColumnRead half of table:read): drop columns the
			// user may not read from the exported rows.
			const allColumnNames = tableStructure.map((column) => column.column_name);
			const readableColumns = await this.cedarPermissions.getReadableColumns(
				userId,
				connectionId,
				tableName,
				allColumnNames,
			);
			const restrictColumns = !isAllColumnsReadable(readableColumns, allColumnNames);

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
				const rowsArray = restrictColumns
					? (rowsStream as unknown as Array<Record<string, unknown>>).map((row) =>
							filterRowByReadableColumns(row, readableColumns),
						)
					: rowsStream;
				return new StreamableFile(csv.stringify(rowsArray as any, { header: true }));
			}
			if (restrictColumns) {
				const columnFilterTransform = new Transform({
					objectMode: true,
					transform(row, _encoding, callback) {
						callback(null, filterRowByReadableColumns(row as Record<string, unknown>, readableColumns));
					},
				});
				return new StreamableFile(rowsStream.pipe(columnFilterTransform).pipe(csv.stringify({ header: true })));
			}
			return new StreamableFile(rowsStream.pipe(csv.stringify({ header: true })));
		} catch (error) {
			operationResult = OperationResultStatusEnum.unsuccessfully;
			if (error instanceof HttpException) {
				throw error;
			}
			// todo: temporary debug log
			await slackPostMessage(`
        CSV Export Failed with error: ${getErrorMessage(error)}\n
        Connection type: ${connection.type}\n
        SSH Option: ${connection.ssh}\n
        SSL Option: ${connection.ssl}\n
        `);
			throw new HttpException(
				{
					message: Messages.CSV_EXPORT_FAILED,
					originalMessage: getErrorMessage(error),
				},
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
		} finally {
			const logRecord = {
				table_name: tableName,
				userId: userId,
				connection: connection,
				operationType: LogOperationTypeEnum.exportRows,
				operationStatusResult: operationResult,
			};
			await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
		}
	}
}
