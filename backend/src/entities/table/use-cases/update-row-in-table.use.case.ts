/* eslint-disable prefer-const */
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import {
	AmplitudeEventTypeEnum,
	LogOperationTypeEnum,
	OperationResultStatusEnum,
} from '../../../enums/index.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import {
	compareArrayElements,
	isObjectEmpty,
	toPrettyErrorsMsg,
} from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { TableActionActivationService } from '../../table-actions/table-actions-module/table-action-activation.service.js';
import { TableLogsService } from '../../table-logs/table-logs.service.js';
import { UpdateRowInTableDs } from '../application/data-structures/update-row-in-table.ds.js';
import { ReferencedTableNamesAndColumnsDs, TableRowRODs } from '../table-datastructures.js';
import { convertBinaryDataInRowUtil } from '../utils/convert-binary-data-in-row.util.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { hashPasswordsInRowUtil } from '../utils/hash-passwords-in-row.util.js';
import { processUuidsInRowUtil } from '../utils/process-uuids-in-row-util.js';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { IUpdateRowInTable } from './table-use-cases.interface.js';
import { validateConnection, getUserEmailForAgent } from '../utils/validate-connection.util.js';
import { extractForeignKeysFromWidgets } from '../utils/extract-foreign-keys-from-widgets.util.js';
import { filterForeignKeysByReadPermission } from '../utils/filter-foreign-keys-by-permission.util.js';
import { attachForeignColumnNames } from '../utils/attach-foreign-column-names.util.js';
import { filterReferencedTablesByPermission, enrichReferencedTablesWithDisplayNames } from '../utils/process-referenced-tables.util.js';
import { buildTableSettingsForResponse } from '../utils/build-table-settings-for-response.util.js';

@Injectable()
export class UpdateRowInTableUseCase
	extends AbstractUseCase<UpdateRowInTableDs, TableRowRODs>
	implements IUpdateRowInTable
{
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

	protected async implementation(inputData: UpdateRowInTableDs): Promise<TableRowRODs> {
		let { connectionId, masterPwd, primaryKey, row, tableName, userId } = inputData;
		let operationResult = OperationResultStatusEnum.unknown;

		const errors = [];
		if (!primaryKey) {
			errors.push(Messages.PRIMARY_KEY_MISSING);
		}

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);

		const dao = getDataAccessObject(connection);

		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);
		const isView = await dao.isView(tableName, userEmail);
		if (isView) {
			throw new HttpException(
				{
					message: Messages.CANT_UPDATE_TABLE_VIEW,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		let [
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

		const builtDAOsTableSettings = buildDAOsTableSettingsDs(tableSettings, personalTableSettings);

		await filterReferencedTablesByPermission(referencedTableNamesAndColumns, userId, connectionId, masterPwd, this.cedarPermissions);
		const referencedTableNamesAndColumnsWithTablesDisplayNames = await enrichReferencedTablesWithDisplayNames(
			referencedTableNamesAndColumns,
			connectionId,
			this._dbContext.tableSettingsRepository.findTableSettings.bind(this._dbContext.tableSettingsRepository),
		);

		if (tableSettings && !tableSettings?.can_update) {
			throw new HttpException(
				{
					message: Messages.CANT_DO_TABLE_OPERATION,
				},
				HttpStatus.FORBIDDEN,
			);
		}

		if (errors.length > 0) {
			throw new HttpException(
				{
					message: toPrettyErrorsMsg(errors),
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const foreignKeysFromWidgets = extractForeignKeysFromWidgets(tableWidgets);

		tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);

		let foreignKeysWithAutocompleteColumns: Array<ForeignKeyWithAutocompleteColumnsDS> = [];
		tableForeignKeys = await filterForeignKeysByReadPermission(
			tableForeignKeys, userId, connectionId, masterPwd, this.cedarPermissions,
		);

		if (tableForeignKeys && tableForeignKeys.length > 0) {
			foreignKeysWithAutocompleteColumns = await Promise.all(
				tableForeignKeys.map((el) =>
					attachForeignColumnNames(
						el, userEmail, connectionId, dao,
						this._dbContext.tableSettingsRepository.findTableSettings.bind(this._dbContext.tableSettingsRepository),
					).catch(() => el as ForeignKeyWithAutocompleteColumnsDS),
				),
			);
		}

		const availablePrimaryColumns = tablePrimaryKeys.map((key) => {
			return key.column_name;
		});
		for (const key in primaryKey) {
			// eslint-disable-next-line security/detect-object-injection
			if (!primaryKey[key] && primaryKey[key] !== '') delete primaryKey[key];
		}
		const receivedPrimaryColumns = Object.keys(primaryKey);

		if (!compareArrayElements(availablePrimaryColumns, receivedPrimaryColumns)) {
			throw new HttpException(
				{
					message: Messages.PRIMARY_KEY_INVALID,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		let oldRowData: Record<string, unknown>;
		try {
			oldRowData = await dao.getRowByPrimaryKey(tableName, primaryKey, builtDAOsTableSettings, userEmail);
		} catch (e) {
			throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_UPDATE_ROW_IN_TABLE);
		}
		if (!oldRowData) {
			throw new HttpException(
				{
					message: Messages.ROW_PRIMARY_KEY_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const oldRowDataLog = {
			...oldRowData,
		};

		const futureRowData = Object.assign(oldRowData, row);
		let futurePrimaryKey = {};
		for (const primaryColumn of tablePrimaryKeys) {
			futurePrimaryKey[primaryColumn.column_name] = futureRowData[primaryColumn.column_name];
		}
		if (isObjectEmpty(futurePrimaryKey)) {
			futurePrimaryKey = primaryKey;
		}

		const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
		try {
			row = await hashPasswordsInRowUtil(row, tableWidgets);
			row = processUuidsInRowUtil(row, tableWidgets);
			await dao.updateRowInTable(tableName, row, primaryKey, userEmail);
			operationResult = OperationResultStatusEnum.successfully;
			let updatedRow = await dao.getRowByPrimaryKey(tableName, futurePrimaryKey, builtDAOsTableSettings, userEmail);
			updatedRow = removePasswordsFromRowsUtil(updatedRow, tableWidgets);
			updatedRow = convertBinaryDataInRowUtil(updatedRow, tableStructure);
			return {
				row: updatedRow,
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
		} catch (e) {
			operationResult = OperationResultStatusEnum.unsuccessfully;
			throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_UPDATE_ROW_IN_TABLE);
		} finally {
			const logRecord = {
				table_name: tableName,
				userId: userId,
				connection: connection,
				operationType: LogOperationTypeEnum.updateRow,
				operationStatusResult: operationResult,
				row: row,
				old_data: oldRowDataLog,
				table_primary_key: primaryKey,
			};
			await this.tableLogsService.crateAndSaveNewLogUtil(logRecord);
			const isTest = isTestConnectionUtil(connection);
			await this.amplitudeService.formAndSendLogRecord(
				isTest ? AmplitudeEventTypeEnum.tableRowAddedTest : AmplitudeEventTypeEnum.tableRowAdded,
				userId,
			);
			const foundAddTableActions = await this._dbContext.tableActionRepository.findTableActionsWithUpdateRowEvents(
				connectionId,
				tableName,
			);
			await this.tableActionActivationService.activateTableActions(
				foundAddTableActions,
				connection,
				primaryKey,
				userId,
				tableName,
				TableActionEventEnum.UPDATE_ROW,
			);
		}
	}

}
