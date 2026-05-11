import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ForeignKeyWithAutocompleteColumnsDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/foreign-key-with-autocomplete-columns.ds.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { buildFoundTableWidgetDs } from '../../widget/utils/build-found-table-widget-ds.js';
import { GetTableStructureDs } from '../application/data-structures/get-table-structure-ds.js';
import { TableStructureDs } from '../table-datastructures.js';
import { attachForeignColumnNames } from '../utils/attach-foreign-column-names.util.js';
import { extractForeignKeysFromWidgets } from '../utils/extract-foreign-keys-from-widgets.util.js';
import { filterForeignKeysByReadPermission } from '../utils/filter-foreign-keys-by-permission.util.js';
import { formFullTableStructure } from '../utils/form-full-table-structure.js';
import { getUserEmailForAgent, validateConnection } from '../utils/validate-connection.util.js';
import { IGetTableStructureWithoutCache } from './table-use-cases.interface.js';

@Injectable()
export class GetTableStructureWithoutCacheUseCase
	extends AbstractUseCase<GetTableStructureDs, TableStructureDs>
	implements IGetTableStructureWithoutCache
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: GetTableStructureDs): Promise<TableStructureDs> {
		const { connectionId, masterPwd, tableName, userId } = inputData;
		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPwd,
		);
		validateConnection(foundConnection);

		try {
			const dao = getDataAccessObject(foundConnection);
			const foundTalesInConnection = await dao.getTablesFromDB();
			if (!foundTalesInConnection.find((el) => el.tableName === tableName)) {
				throw new HttpException(
					{
						message: Messages.TABLE_NOT_FOUND,
					},
					HttpStatus.BAD_REQUEST,
				);
			}
			const userEmail = await getUserEmailForAgent(foundConnection, userId, this._dbContext.userRepository);

			// eslint-disable-next-line prefer-const
			let [tableSettings, personalTableSettings, tablePrimaryColumns, tableForeignKeys, tableStructure, tableWidgets] =
				await Promise.all([
					this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
					this._dbContext.personalTableSettingsRepository.findUserTableSettings(userId, connectionId, tableName),
					dao.getTablePrimaryColumns(tableName, userEmail),
					dao.getTableForeignKeys(tableName, userEmail),
					dao.getTableStructureWithoutCache(tableName, userEmail),
					this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
				]);
			const foreignKeysFromWidgets = extractForeignKeysFromWidgets(tableWidgets);

			tableForeignKeys = tableForeignKeys.concat(foreignKeysFromWidgets);
			let transformedTableForeignKeys: Array<ForeignKeyWithAutocompleteColumnsDS> = [];
			tableForeignKeys = await filterForeignKeysByReadPermission(
				tableForeignKeys,
				userId,
				connectionId,
				masterPwd,
				this.cedarPermissions,
			);

			if (tableForeignKeys && tableForeignKeys.length > 0) {
				transformedTableForeignKeys = await Promise.all(
					tableForeignKeys.map((el) =>
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
			const readonly_fields = tableSettings?.readonly_fields?.length > 0 ? tableSettings.readonly_fields : [];
			const formedTableStructure = formFullTableStructure(tableStructure, tableSettings);
			return {
				structure: formedTableStructure,
				primaryColumns: tablePrimaryColumns,
				foreignKeys: transformedTableForeignKeys,
				readonly_fields: readonly_fields,
				table_widgets: tableWidgets?.length > 0 ? tableWidgets.map((widget) => buildFoundTableWidgetDs(widget)) : [],
				list_fields: personalTableSettings?.list_fields ? personalTableSettings.list_fields : [],
				display_name: tableSettings?.display_name ? tableSettings.display_name : null,
				excluded_fields: tableSettings?.excluded_fields ? tableSettings.excluded_fields : [],
			};
		} catch (e) {
			if (e instanceof HttpException) {
				throw e;
			}
			throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_TABLE_STRUCTURE);
		}
	}
}
