import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js';
import * as Sentry from '@sentry/node';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { ITableAndViewPermissionData } from '../../permission/permission.interface.js';
import { FindTablesDs } from '../../table/application/data-structures/find-tables.ds.js';
import { FoundTableDs } from '../../table/application/data-structures/found-table.ds.js';
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
		let connection: ConnectionEntity;
		try {
			connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		} catch (error) {
			if (error.message === Messages.MASTER_PASSWORD_MISSING) {
				throw new HttpException(
					{
						message: Messages.MASTER_PASSWORD_MISSING,
						type: 'no_master_key',
					},
					HttpStatus.BAD_REQUEST,
				);
			}
			if (error.message === Messages.MASTER_PASSWORD_INCORRECT) {
				throw new HttpException(
					{
						message: Messages.MASTER_PASSWORD_INCORRECT,
						type: 'invalid_master_key',
					},
					HttpStatus.BAD_REQUEST,
				);
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
		let userEmail: string;

		if (isConnectionTypeAgent(connection.type)) {
			userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
		}
		let tables: Array<TableDS>;
		try {
			tables = await dao.getTablesFromDB(userEmail);
		} catch (e) {
			Sentry.captureException(e);
			throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_TABLES);
		}

		const tableNames = tables.map((t) => t.tableName);
		const permissionsArr = await this.cedarPermissions.getUserPermissionsForAvailableTables(userId, connectionId, tableNames);
		const tablesWithPermissions: Array<ITableAndViewPermissionData> = permissionsArr.map((perm) => ({
			...perm,
			isView: tables.find((t) => t.tableName === perm.tableName)?.isView || false,
		}));
		const excludedTables = await this._dbContext.connectionPropertiesRepository.findConnectionProperties(connectionId);
		let tablesRO = await this.addDisplayNamesForTables(connectionId, tablesWithPermissions);
		if (excludedTables?.hidden_tables?.length) {
			tablesRO = tablesRO.filter((tableRO) => {
				return !excludedTables.hidden_tables.includes(tableRO.table);
			});
		}

		const foundTableCategories =
			await this._dbContext.tableCategoriesRepository.findTableCategoriesForConnection(connectionId);

		const storedAllTablesCategory = foundTableCategories.find((category) => category.category_id === 'all-tables-kitten');
		const otherCategories = foundTableCategories.filter((category) => category.category_id !== 'all-tables-kitten');

		let allTablesOrdered: Array<FoundTableDs>;
		if (storedAllTablesCategory) {
			allTablesOrdered = storedAllTablesCategory.tables
				.map((tableName) => tablesRO.find((tableRO) => tableRO.table === tableName))
				.filter(Boolean);

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
				.filter(Boolean);
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
