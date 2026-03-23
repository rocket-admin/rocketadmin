import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { validateSchemaCache } from '@rocketadmin/shared-code/dist/src/caching/schema-cache-validator.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';
import * as Sentry from '@sentry/node';
import PQueue from 'p-queue';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeEventTypeEnum } from '../../../enums/index.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { WinstonLogger } from '../../logging/winston-logger.js';
import { ITableAndViewPermissionData } from '../../permission/permission.interface.js';
import { TableInfoEntity } from '../../table-info/table-info.entity.js';
import { TableSettingsEntity } from '../../table-settings/common-table-settings/table-settings.entity.js';
import { FindTablesDs } from '../application/data-structures/find-tables.ds.js';
import { FoundTableDs } from '../application/data-structures/found-table.ds.js';
import { buildTableFieldInfoEntity, buildTableInfoEntity } from '../utils/save-tables-info-in-database.util.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { IFindTablesInConnection } from './table-use-cases.interface.js';

@Injectable()
export class FindTablesInConnectionUseCase
	extends AbstractUseCase<FindTablesDs, Array<FoundTableDs>>
	implements IFindTablesInConnection
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private amplitudeService: AmplitudeService,
		private readonly logger: WinstonLogger,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: FindTablesDs): Promise<Array<FoundTableDs>> {
		const { connectionId, hiddenTablesOption, masterPwd, userId } = inputData;
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
		let operationResult = false;
		if (isConnectionTypeAgent(connection.type)) {
			userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
		}

		await validateSchemaCache(dao, userEmail);

		let tables: Array<TableDS>;
		try {
			tables = await dao.getTablesFromDB(userEmail);
			operationResult = true;
		} catch (e) {
			operationResult = false;
			Sentry.captureException(e);
			throw new UnknownSQLException(e.message, ExceptionOperations.FAILED_TO_GET_TABLES);
		} finally {
			if (!connection.isTestConnection && tables && tables.length) {
				this.logger.log({
					tables: tables.map((table) => table.tableName),
					connectionId: connectionId,
					connectionType: connection.type,
				});
			}
			const isTest = isTestConnectionUtil(connection);
			await this.amplitudeService.formAndSendLogRecord(
				isTest ? AmplitudeEventTypeEnum.tableListReceivedTest : AmplitudeEventTypeEnum.tableListReceived,
				userId,
				{ tablesCount: tables?.length ? tables.length : 0 },
			);
			if (
				connection.saved_table_info === 0 &&
				!connection.isTestConnection &&
				operationResult &&
				process.env.NODE_ENV !== 'test'
			) {
				this.saveTableInfoInDatabase(connection.id, userId, tables, masterPwd);
			}
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
			if (!hiddenTablesOption) {
				tablesRO = tablesRO.filter((tableRO) => {
					return !excludedTables.hidden_tables.includes(tableRO.table);
				});
			} else {
				const userConnectionEdit = await this.cedarPermissions.checkUserConnectionEdit(
					userId,
					connectionId,
				);
				if (!userConnectionEdit) {
					throw new HttpException(
						{
							message: Messages.DONT_HAVE_PERMISSIONS,
						},
						HttpStatus.FORBIDDEN,
					);
				}
			}
		}
		return tablesRO.sort((tableRO1, tableRO2) => {
			const display_name1 = tableRO1.display_name;
			const display_name2 = tableRO2.display_name;
			if (display_name1 && display_name2) {
				return display_name1.localeCompare(display_name2);
			}
			if (!display_name1 && !display_name2) {
				return tableRO1.table.localeCompare(tableRO2.table);
			}
			if (!display_name1 && display_name2) {
				return tableRO1.table.localeCompare(display_name2);
			}
			if (display_name1 && !display_name2) {
				return display_name1.localeCompare(tableRO2.table);
			}
			return 0;
		});
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

	private async saveTableInfoInDatabase(
		connectionId: string,
		_userId: string,
		tables: Array<TableDS>,
		masterPwd: string,
	): Promise<void> {
		try {
			const foundConnection = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });
			if (!foundConnection) {
				return;
			}
			const decryptedConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
				connectionId,
				masterPwd,
			);
			const tableNames: Array<string> = tables.map((table) => table.tableName);
			const queue = new PQueue({ concurrency: 2 });
			const dao = getDataAccessObject(decryptedConnection);
			const tablesStructures: Array<{
				tableName: string;
				structure: Array<TableStructureDS>;
			}> = (await Promise.all(
				tableNames.map(async (tableName) => {
					return await queue.add(async () => {
						const structure = await dao.getTableStructure(tableName, undefined);
						return {
							tableName: tableName,
							structure: structure,
						};
					});
				}),
			)) as Array<{
				tableName: string;
				structure: Array<TableStructureDS>;
			}>;
			foundConnection.tables_info = (await Promise.all(
				tablesStructures.map(async (tableStructure) => {
					return await queue.add(async () => {
						const newTableInfo = buildTableInfoEntity(tableStructure.tableName, foundConnection);
						const savedTableInfo = await this._dbContext.tableInfoRepository.save(newTableInfo);
						const newTableFieldsInfos = tableStructure.structure.map((el) =>
							buildTableFieldInfoEntity(el, savedTableInfo),
						);
						newTableInfo.table_fields_info = await this._dbContext.tableFieldInfoRepository.save(newTableFieldsInfos);
						await this._dbContext.tableInfoRepository.save(newTableInfo);
						return newTableInfo;
					});
				}),
			)) as Array<TableInfoEntity>;
			foundConnection.saved_table_info = ++foundConnection.saved_table_info;
			await this._dbContext.connectionRepository.saveUpdatedConnection(foundConnection);
		} catch (e) {
			Sentry.captureException(e);
			console.error(e);
		}
	}
}
