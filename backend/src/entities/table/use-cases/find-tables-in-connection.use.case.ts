import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { validateSchemaCache } from '@rocketadmin/shared-code/dist/src/caching/schema-cache-validator.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TableDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table.ds.js';
import * as Sentry from '@sentry/node';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeEventTypeEnum } from '../../../enums/amplitude-event-type.enum.js';
import { ExceptionOperations } from '../../../exceptions/custom-exceptions/exception-operation.js';
import { UnknownSQLException } from '../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/is-connection-entity-agent.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { CedarPermissionsService } from '../../cedar-authorization/cedar-permissions.service.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';
import { isTestConnectionUtil } from '../../connection/utils/is-test-connection-util.js';
import { WinstonLogger } from '../../logging/winston-logger.js';
import { ITableAndViewPermissionData } from '../../permission/permission.interface.js';
import { FindTablesDs } from '../application/data-structures/find-tables.ds.js';
import { FoundTableDs } from '../application/data-structures/found-table.ds.js';
import { addDisplayNamesForTables } from '../utils/add-display-names-for-tables.util.js';
import { saveTableInfoInDatabase } from '../utils/save-table-info-in-database-orchestrator.util.js';
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
				saveTableInfoInDatabase(connection.id, tables, masterPwd, this._dbContext);
			}
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
		const tableSettings = await this._dbContext.tableSettingsRepository.findTableSettingsInConnectionPure(connectionId);
		let tablesRO = addDisplayNamesForTables(tableSettings, tablesWithPermissions);
		if (excludedTables?.hidden_tables?.length) {
			if (!hiddenTablesOption) {
				tablesRO = tablesRO.filter((tableRO) => {
					return !excludedTables.hidden_tables.includes(tableRO.table);
				});
			} else {
				const userConnectionEdit = await this.cedarPermissions.checkUserConnectionEdit(userId, connectionId);
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
		return tablesRO.sort((a, b) => {
			const nameA = a.display_name || a.table;
			const nameB = b.display_name || b.table;
			return nameA.localeCompare(nameB);
		});
	}
}
