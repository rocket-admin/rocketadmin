import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js';
import * as Sentry from '@sentry/node';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { MasterPasswordIncorrectException } from '../../../exceptions/custom-exceptions/master-password-incorrect-exception.js';
import { MasterPasswordMissingException } from '../../../exceptions/custom-exceptions/master-password-missing-exception.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { ITableAndViewPermissionData } from '../../permission/permission.interface.js';
import { FindTablesDs } from '../../table/application/data-structures/find-tables.ds.js';
import { FoundTableDs } from '../../table/application/data-structures/found-table.ds.js';
import { getUserEmailForAgent } from '../../table/utils/validate-connection.util.js';
import { TableSettingsEntity } from '../../table-settings/common-table-settings/table-settings.entity.js';
import { FoundTableCategoriesWithTablesRo } from '../dto/found-table-categories-with-tables.ro.js';
import { IFindTableCategoriesWithTables } from './table-categories-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class FindTableCategoriesWithTablesUseCase
	extends AbstractUseCase<FindTablesDs, Array<FoundTableCategoriesWithTablesRo>>
	implements IFindTableCategoriesWithTables
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: FindTablesDs): Promise<Array<FoundTableCategoriesWithTablesRo>> {
		const { connectionId, masterPwd, userId } = inputData;
		let connection: ConnectionEntity | null = null;
		try {
			connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		} catch (error) {
			const errMessage = getErrorMessage(error);
			if (errMessage === Messages.MASTER_PASSWORD_MISSING) {
				throw new MasterPasswordMissingException();
			}
			if (errMessage === Messages.MASTER_PASSWORD_INCORRECT) {
				throw new MasterPasswordIncorrectException();
			}
		}
		if (!connection) {
			throw new HttpException(
				{
					message: Messages.CONNECTION_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const dao = getDataAccessObject(connection);
		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);
		let tables: Array<TableDS>;
		try {
			tables = await dao.getTablesFromDB(userEmail);
		} catch (e) {
			Sentry.captureException(e);
			throw new UnknownSQLException(getErrorMessage(e), ExceptionOperations.FAILED_TO_GET_TABLES);
		}

		const tableNames = tables.map((t) => t.tableName);
		const permissionsArr = await this.cedarPermissions.getUserPermissionsForAvailableTables(
			userId,
			connectionId,
			tableNames,
		);
		const tablesWithPermissions: Array<ITableAndViewPermissionData> = permissionsArr.map((perm) => ({
			...perm,
			isView: tables.find((t) => t.tableName === perm.tableName)?.isView || false,
		}));
		const excludedTables = await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);
		let tablesRO = await this.addDisplayNamesForTables(connectionId, tablesWithPermissions);
		const hiddenTables = excludedTables?.hidden_tables;
		if (hiddenTables?.length) {
			tablesRO = tablesRO.filter((tableRO) => {
				return !hiddenTables.includes(tableRO.table);
			});
		}

		const foundTableCategories =
			await this._dbContext.tableCategoriesRepository.findTableCategoriesForConnection(connectionId);

		const storedAllTablesCategory = foundTableCategories.find(
			(category) => category.category_id === 'all-tables-kitten',
		);
		const otherCategories = foundTableCategories.filter((category) => category.category_id !== 'all-tables-kitten');

		let allTablesOrdered: Array<FoundTableDs>;
		if (storedAllTablesCategory) {
			allTablesOrdered = storedAllTablesCategory.tables
				.map((tableName) => tablesRO.find((tableRO) => tableRO.table === tableName))
				.filter((tableRO): tableRO is FoundTableDs => Boolean(tableRO));

			const storedTableNames = new Set(storedAllTablesCategory.tables);
			const newTables = tablesRO.filter((tableRO) => !storedTableNames.has(tableRO.table));

			if (newTables.length > 0) {
				allTablesOrdered = [...allTablesOrdered, ...newTables];
				storedAllTablesCategory.tables = allTablesOrdered.map((t) => t.table);
				await this._dbContext.tableCategoriesRepository.save(storedAllTablesCategory);
			}
		} else {
			allTablesOrdered = tablesRO;
		}

		const allTableCategory: FoundTableCategoriesWithTablesRo = {
			category_id: 'all-tables-kitten',
			category_color: storedAllTablesCategory?.category_color ?? null,
			category_name: 'All tables',
			tables: allTablesOrdered,
		};
		const foundTableCategoriesRO = otherCategories.map((category) => {
			const tablesInCategory = category.tables
				.map((tableName) => tablesRO.find((tableRO) => tableRO.table === tableName))
				.filter((tableRO): tableRO is FoundTableDs => Boolean(tableRO));
			return {
				category_id: category.category_id,
				category_color: category.category_color,
				category_name: category.category_name,
				tables: tablesInCategory,
			};
		});
		return [allTableCategory, ...foundTableCategoriesRO];
	}

	private async addDisplayNamesForTables(
		connectionId: string,
		tablesObjArr: Array<ITableAndViewPermissionData>,
	): Promise<Array<FoundTableDs>> {
		const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettingsInConnectionPure(connectionId);
		return tablesObjArr.map((tableObj: ITableAndViewPermissionData) => {
			const foundTableSettings =
				tableSettings[
					tableSettings.findIndex((el: TableSettingsEntity) => {
						return el.table_name === tableObj.tableName;
					})
				];
			const displayName = foundTableSettings ? foundTableSettings.display_name : undefined;
			const icon = foundTableSettings ? foundTableSettings.icon : undefined;
			return {
				table: tableObj.tableName,
				isView: tableObj.isView || false,
				permissions: tableObj.accessLevel,
				display_name: displayName,
				icon: icon,
			};
		});
	}
}
