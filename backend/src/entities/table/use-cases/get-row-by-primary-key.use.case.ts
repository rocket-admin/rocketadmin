/* eslint-disable prefer-const */
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { validateSchemaCache } from '@rocketadmin/shared-code/dist/src/caching/schema-cache-validator.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { compareArrayElements } from '../../../helpers/index.js';
import { buildActionEventDto } from '../../table-actions/table-action-rules-module/utils/build-found-action-event-dto.util.js';
import { GetRowByPrimaryKeyDs } from '../application/data-structures/get-row-by-primary-key.ds.js';
import { ReferencedTableNamesAndColumnsDs, TableRowRODs } from '../table-datastructures.js';
import { convertBinaryDataInRowUtil } from '../utils/convert-binary-data-in-row.util.js';
import { convertHexDataInPrimaryKeyUtil } from '../utils/convert-hex-data-in-primary-key.util.js';
import { findAvailableFields } from '../utils/find-available-fields.utils.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { removePasswordsFromRowsUtil } from '../utils/remove-password-from-row.util.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { IGetRowByPrimaryKey } from './table-use-cases.interface.js';
import { validateConnection, getUserEmailForAgent } from '../utils/validate-connection.util.js';
import { extractForeignKeysFromWidgets } from '../utils/extract-foreign-keys-from-widgets.util.js';
import { filterForeignKeysByReadPermission } from '../utils/filter-foreign-keys-by-permission.util.js';
import { attachForeignColumnNames } from '../utils/attach-foreign-column-names.util.js';
import { filterReferencedTablesByPermission, enrichReferencedTablesWithDisplayNames } from '../utils/process-referenced-tables.util.js';
import { buildTableSettingsForResponse } from '../utils/build-table-settings-for-response.util.js';

@Injectable()
export class GetRowByPrimaryKeyUseCase
	extends AbstractUseCase<GetRowByPrimaryKeyDs, TableRowRODs>
	implements IGetRowByPrimaryKey
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: GetRowByPrimaryKeyDs): Promise<TableRowRODs> {
		let { connectionId, masterPwd, primaryKey, tableName, userId } = inputData;
		if (!primaryKey) {
			throw new HttpException(
				{
					message: Messages.PRIMARY_KEY_MISSING,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);

		const dao = getDataAccessObject(connection);

		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

		await validateSchemaCache(dao, userEmail);

		let [
			tableStructure,
			tableWidgets,
			tableSettings,
			personalTableSettings,
			tableForeignKeys,
			tablePrimaryKeys,
			customActionEvents,
			referencedTableNamesAndColumns,
			tableAccessLevel,
		] = await Promise.all([
			dao.getTableStructure(tableName, userEmail),
			this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
			this._dbContext.tableSettingsRepository.findTableSettingsPure(connectionId, tableName),
			this._dbContext.personalTableSettingsRepository.findUserTableSettings(userId, connectionId, tableName),
			dao.getTableForeignKeys(tableName, userEmail),
			dao.getTablePrimaryColumns(tableName, userEmail),
			this._dbContext.actionEventsRepository.findCustomEventsForTable(connectionId, tableName),
			dao.getReferencedTableNamesAndColumns(tableName, userEmail),
			this.cedarPermissions.getUserTablePermissions(userId, connectionId, tableName, masterPwd),
		]);
		primaryKey = convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure);
		const availablePrimaryColumns: Array<string> = tablePrimaryKeys.map((column) => column.column_name);
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

		const foreignKeysFromWidgets = extractForeignKeysFromWidgets(tableWidgets);

		tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);
		tableForeignKeys = await filterForeignKeysByReadPermission(
			tableForeignKeys, userId, connectionId, masterPwd, this.cedarPermissions,
		);

		let foreignKeysWithAutocompleteColumns: Array<ForeignKeyWithAutocompleteColumnsDS> = [];
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
		let rowData: Record<string, unknown>;
		const builtDAOsTableSettings = buildDAOsTableSettingsDs(tableSettings, personalTableSettings);
		try {
			rowData = await dao.getRowByPrimaryKey(tableName, primaryKey, builtDAOsTableSettings, userEmail);
		} catch (e) {
			throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_ROW_BY_PRIMARY_KEY);
		}

		if (!rowData) {
			throw new HttpException(
				{
					message: Messages.ROW_PRIMARY_KEY_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		rowData = removePasswordsFromRowsUtil(rowData, tableWidgets);
		rowData = convertBinaryDataInRowUtil(rowData, tableStructure);
		const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);

		await filterReferencedTablesByPermission(referencedTableNamesAndColumns, userId, connectionId, masterPwd, this.cedarPermissions);
		const referencedTableNamesAndColumnsWithTablesDisplayNames = await enrichReferencedTablesWithDisplayNames(
			referencedTableNamesAndColumns,
			connectionId,
			this._dbContext.tableSettingsRepository.findTableSettings.bind(this._dbContext.tableSettingsRepository),
		);
		//todo remove unnecessary fields
		return {
			row: rowData,
			foreignKeys: foreignKeysWithAutocompleteColumns,
			primaryColumns: tablePrimaryKeys,
			structure: formedTableStructure,
			table_widgets: tableWidgets,
			readonly_fields: tableSettings?.readonly_fields ? tableSettings.readonly_fields : [],
			list_fields: findAvailableFields(builtDAOsTableSettings, tableStructure),
			action_events: customActionEvents.map((event) => buildActionEventDto(event)),
			table_actions: customActionEvents.map((el) => buildActionEventDto(el)),
			identity_column: tableSettings?.identity_column ? tableSettings.identity_column : null,
			referenced_table_names_and_columns: referencedTableNamesAndColumnsWithTablesDisplayNames,
			display_name: tableSettings?.display_name ? tableSettings.display_name : null,
			table_access_level: tableAccessLevel.accessLevel,
			excluded_fields: tableSettings?.excluded_fields ? tableSettings.excluded_fields : [],
			can_delete: tableSettings ? tableSettings.can_delete : true,
			can_update: tableSettings ? tableSettings.can_update : true,
			can_add: tableSettings ? tableSettings.can_add : true,
			table_settings: buildTableSettingsForResponse(builtDAOsTableSettings, tableSettings),
		};
	}
}
