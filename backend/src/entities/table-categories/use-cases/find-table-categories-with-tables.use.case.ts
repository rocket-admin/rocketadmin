import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js';
import * as Sentry from '@sentry/node';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum } from '../../../enums/access-level.enum.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { isObjectPropertyExists } from '../../../helpers/validators/is-object-property-exists-validator.js';
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

		const tablesWithPermissions = await this.getUserPermissionsForAvailableTables(userId, connectionId, tables);
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

	private async getUserPermissionsForAvailableTables(
		userId: string,
		connectionId: string,
		tables: Array<TableDS>,
	): Promise<Array<ITableAndViewPermissionData>> {
		const connectionEdit = await this._dbContext.userAccessRepository.checkUserConnectionEdit(userId, connectionId);
		if (connectionEdit) {
			return tables.map((table) => {
				return {
					tableName: table.tableName,
					isView: table.isView,
					accessLevel: {
						visibility: true,
						readonly: false,
						add: true,
						delete: true,
						edit: true,
					},
				};
			});
		}

		const allTablePermissions =
			await this._dbContext.permissionRepository.getAllUserPermissionsForAllTablesInConnection(userId, connectionId);
		const tablesAndAccessLevels = {};
		tables.map((table) => {
			if (table.tableName !== '__proto__') {
				tablesAndAccessLevels[table.tableName] = [];
			}
		});
		tables.map((table) => {
			allTablePermissions.map((permission) => {
				if (
					permission.tableName === table.tableName &&
					isObjectPropertyExists(tablesAndAccessLevels, table.tableName)
				) {
					tablesAndAccessLevels[table.tableName].push(permission.accessLevel);
				}
			});
		});
		const tablesWithPermissions: Array<ITableAndViewPermissionData> = [];
		for (const key in tablesAndAccessLevels) {
			// eslint-disable-next-line security/detect-object-injection
			const addPermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.add);
			// eslint-disable-next-line security/detect-object-injection
			const deletePermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.delete);
			// eslint-disable-next-line security/detect-object-injection
			const editPermission = tablesAndAccessLevels[key].includes(AccessLevelEnum.edit);

			const readOnly = !(addPermission || deletePermission || editPermission);
			tablesWithPermissions.push({
				tableName: key,
				isView: tables.find((table) => table.tableName === key).isView,
				accessLevel: {
					// eslint-disable-next-line security/detect-object-injection
					visibility: tablesAndAccessLevels[key].includes(AccessLevelEnum.visibility),
					// eslint-disable-next-line security/detect-object-injection
					readonly: tablesAndAccessLevels[key].includes(AccessLevelEnum.readonly) && !readOnly,
					add: addPermission,
					delete: deletePermission,
					edit: editPermission,
				},
			});
		}
		return tablesWithPermissions.filter((tableWithPermission: ITableAndViewPermissionData) => {
			return !!tableWithPermission.accessLevel.visibility;
		});
	}
}
