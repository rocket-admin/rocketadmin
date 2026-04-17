import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeEventTypeEnum, LogOperationTypeEnum, OperationResultStatusEnum } from '../../../enums/index.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isObjectEmpty, toPrettyErrorsMsg } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { TableActionActivationService } from '../../table-actions/table-actions-module/table-action-activation.service.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { AddRowInTableDs } from '../application/data-structures/add-row-in-table.ds.js';
import { ReferencedTableNamesAndColumnsDs, TableRowRODs } from '../table-datastructures.js';
import { attachForeignColumnNames } from '../utils/attach-foreign-column-names.util.js';
import { buildTableSettingsForResponse } from '../utils/build-table-settings-for-response.util.js';
import { convertHexDataInRowUtil } from '../utils/convert-hex-data-in-row.util.js';
import { extractForeignKeysFromWidgets } from '../utils/extract-foreign-keys-from-widgets.util.js';
import { filterForeignKeysByReadPermission } from '../utils/filter-foreign-keys-by-permission.util.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { hashPasswordsInRowUtil } from '../utils/hash-passwords-in-row.util.js';
import {
	enrichReferencedTablesWithDisplayNames,
	filterReferencedTablesByPermission,
} from '../utils/process-referenced-tables.util.js';
import { processUuidsInRowUtil } from '../utils/process-uuids-in-row-util.js';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util.js';
import { getUserEmailForAgent, validateConnection } from '../utils/validate-connection.util.js';
import { validateTableRowUtil } from '../utils/validate-table-row.util.js';
import { IAddRowInTable } from './table-use-cases.interface.js';

@Injectable()
export class AddRowInTableUseCase extends AbstractUseCase<AddRowInTableDs, TableRowRODs> implements IAddRowInTable {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private amplitudeService: AmplitudeService,
		private tableLogsService: TableLogsService,
		private tableActionActivationService: TableActionActivationService,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: AddRowInTableDs): Promise<TableRowRODs> {
		const { connectionId, masterPwd, tableName, userId } = inputData;
		let { row } = inputData;
		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);
		let operationResult = OperationResultStatusEnum.unknown;

		const dao = getDataAccessObject(connection);

		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

		const tablesInConnection = await dao.getTablesFromDB(userEmail);
		const isTableInConnection = tablesInConnection.some((el) => el.tableName === tableName);
		if (!isTableInConnection) {
			throw new HttpException(
				{
					message: Messages.TABLE_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const isView = await dao.isView(tableName, userEmail);
		if (isView) {
			throw new HttpException(
				{
					message: Messages.CANT_UPDATE_TABLE_VIEW,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const [
			tableStructure,
			tableWidgets,
			tableSettings,
			personalTableSettings,
			tableForeignKeys,
			tablePrimaryKeys,
			referencedTableNamesAndColumns,
		] = await Promise.all([
			dao.getTableStructure(tableName, userEmail),
			this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
			this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
			this._dbContext.personalTableSettingsRepository.findUserTableSettings(userId, connectionId, tableName),
			dao.getTableForeignKeys(tableName, userEmail),
			dao.getTablePrimaryColumns(tableName, userEmail),
			dao.getReferencedTableNamesAndColumns(tableName, userEmail),
		]);

		await filterReferencedTablesByPermission(
			referencedTableNamesAndColumns,
			userId,
			connectionId,
			masterPwd,
			this.cedarPermissions,
		);
		const referencedTableNamesAndColumnsWithTablesDisplayNames = await enrichReferencedTablesWithDisplayNames(
			referencedTableNamesAndColumns,
			connectionId,
			this._dbContext.tableSettingsRepository.findTableSettings.bind(this._dbContext.tableSettingsRepository),
		);

		if (tableSettings && !tableSettings?.can_add) {
			throw new HttpException(
				{
					message: Messages.CANT_DO_TABLE_OPERATION,
				},
				HttpStatus.FORBIDDEN,
			);
		}

		const foreignKeysFromWidgets = extractForeignKeysFromWidgets(tableWidgets);

		let foreignKeysWithKeysFromWidgets = [...tableForeignKeys, ...foreignKeysFromWidgets];

		let foreignKeysWithAutocompleteColumns: Array<ForeignKeyWithAutocompleteColumnsDS> = [];

		foreignKeysWithKeysFromWidgets = await filterForeignKeysByReadPermission(
			foreignKeysWithKeysFromWidgets,
			userId,
			connectionId,
			masterPwd,
			this.cedarPermissions,
		);

		if (foreignKeysWithKeysFromWidgets?.length > 0) {
			foreignKeysWithAutocompleteColumns = await Promise.all(
				foreignKeysWithKeysFromWidgets.map((el) =>
					attachForeignColumnNames(
						el,
						userEmail,
						connectionId,
						dao,
						this._dbContext.tableSettingsRepository.findTableSettings.bind(this._dbContext.tableSettingsRepository),
					).catch(() => el as ForeignKeyWithAutocompleteColumnsDS),
				),
			);
		}

		const errors = validateTableRowUtil(row, tableStructure);
		if (errors.length > 0) {
			throw new HttpException(
				{
					message: toPrettyErrorsMsg(errors),
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
		let addedRow: Record<string, unknown> = {};
		let addedRowPrimaryKey: Record<string, unknown>;
		const builtDAOsTableSettings = buildDAOsTableSettingsDs(tableSettings, personalTableSettings);
		try {
			row = await hashPasswordsInRowUtil(row, tableWidgets);
			row = processUuidsInRowUtil(row, tableWidgets);
			row = convertHexDataInRowUtil(row, tableStructure);
			addedRowPrimaryKey = (await dao.addRowInTable(tableName, row, userEmail)) as Record<string, unknown>;
			if (addedRowPrimaryKey && !isObjectEmpty(addedRowPrimaryKey)) {
				operationResult = OperationResultStatusEnum.successfully;
				addedRow = await dao.getRowByPrimaryKey(tableName, addedRowPrimaryKey, builtDAOsTableSettings, userEmail);
				addedRow = removePasswordsFromRowsUtil(addedRow, tableWidgets);
				return {
					row: addedRow,
					foreignKeys: foreignKeysWithAutocompleteColumns,
					primaryColumns: tablePrimaryKeys,
					structure: formedTableStructure,
					table_widgets: tableWidgets,
					display_name: tableSettings?.display_name ? tableSettings.display_name : null,
					readonly_fields: tableSettings?.readonly_fields ? tableSettings.readonly_fields : [],
					list_fields: personalTableSettings?.list_fields?.length > 0 ? personalTableSettings.list_fields : [],
					identity_column: tableSettings?.identity_column ? tableSettings.identity_column : null,
					referenced_table_names_and_columns: referencedTableNamesAndColumnsWithTablesDisplayNames,
					excluded_fields: tableSettings?.excluded_fields ? tableSettings.excluded_fields : [],
					can_delete: tableSettings ? tableSettings.can_delete : true,
					can_update: tableSettings ? tableSettings.can_update : true,
					can_add: tableSettings ? tableSettings.can_add : true,
					table_settings: buildTableSettingsForResponse(builtDAOsTableSettings, tableSettings),
				};
			}
		} catch (e) {
			operationResult = OperationResultStatusEnum.unsuccessfully;
			throw new HttpException(
				{
					message: e.message.includes('duplicate key value')
						? Messages.CANT_INSERT_DUPLICATE_KEY
						: `${Messages.FAILED_ADD_ROW_IN_TABLE}
         ${Messages.ERROR_MESSAGE} ${e.message} ${Messages.TRY_AGAIN_LATER}`,
				},
				HttpStatus.BAD_REQUEST,
			);
		} finally {
			const logRecord = {
				table_name: tableName,
				userId: userId,
				connection: connection,
				operationType: LogOperationTypeEnum.addRow,
				operationStatusResult: operationResult,
				row: row,
				affected_primary_key: addedRowPrimaryKey,
			};
			await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
			const isTest = isTestConnectionUtil(connection);
			await this.amplitudeService.formAndSendLogRecord(
				isTest ? AmplitudeEventTypeEnum.tableRowAddedTest : AmplitudeEventTypeEnum.tableRowAdded,
				userId,
			);

			const foundAddTableActions = await this._dbContext.tableActionRepository.findTableActionsWithAddRowEvents(
				connectionId,
				tableName,
			);

			await this.tableActionActivationService.activateTableActions(
				foundAddTableActions,
				connection,
				addedRow,
				userId,
				tableName,
				TableActionEventEnum.ADD_ROW,
			);
		}
	}
}
