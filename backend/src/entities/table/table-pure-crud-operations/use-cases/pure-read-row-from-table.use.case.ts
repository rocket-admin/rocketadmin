import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { validateSchemaCache } from '@rocketadmin/shared-code/dist/src/caching/schema-cache-validator.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { ExceptionOperations } from '../../../../exceptions/custom-exceptions/exception-operation.js';
import { PrimaryKeyMissingException } from '../../../../exceptions/custom-exceptions/primary-key-missing-exception.js';
import { UnknownSQLException } from '../../../../exceptions/custom-exceptions/unknown-sql-exception.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { compareArrayElements } from '../../../../helpers/compare-array-elements.js';
import { getErrorMessage } from '../../../../helpers/get-error-message.js';
import { CedarPermissionsService } from '../../../cedar-authorization/cedar-permissions.service.js';
import { buildCommonTableSettingsInput } from '../../utils/build-common-table-settings-input.util.js';
import { convertHexDataInPrimaryKeyUtil } from '../../utils/convert-hex-data-in-primary-key.util.js';
import {
	filterRowByReadableColumns,
	isAllColumnsReadable,
} from '../../utils/filter-columns-by-read-permission.util.js';
import { removePasswordsFromRowsUtil } from '../../utils/remove-password-from-row.util.js';
import { getUserEmailForAgent, validateConnection } from '../../utils/validate-connection.util.js';
import { PureCrudRowResponseDs } from '../application/data-structures/pure-crud-row-response.ds.js';
import { PureReadRowDs } from '../application/data-structures/pure-read-row.ds.js';
import { IPureReadRowFromTable } from './table-pure-crud-use-cases.interface.js';

@Injectable()
export class PureReadRowFromTableUseCase
	extends AbstractUseCase<PureReadRowDs, PureCrudRowResponseDs>
	implements IPureReadRowFromTable
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarPermissions: CedarPermissionsService,
	) {
		super();
	}

	protected async implementation(inputData: PureReadRowDs): Promise<PureCrudRowResponseDs> {
		const { connectionId, masterPwd, tableName, userId } = inputData;
		let { primaryKey } = inputData;
		if (!primaryKey) {
			throw new PrimaryKeyMissingException();
		}

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);

		const dao = getDataAccessObject(connection);
		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

		await validateSchemaCache(dao, userEmail);

		const [tableStructure, tableWidgets, tableSettings, primaryColumns] = await Promise.all([
			dao.getTableStructure(tableName, userEmail),
			this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
			this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
			dao.getTablePrimaryColumns(tableName, userEmail),
		]);

		primaryKey = convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure);
		const availablePrimaryColumns = primaryColumns.map((column) => column.column_name);
		for (const key in primaryKey) {
			// eslint-disable-next-line security/detect-object-injection
			if (!primaryKey[key] && primaryKey[key] !== '') delete primaryKey[key];
		}
		const receivedPrimaryColumns = Object.keys(primaryKey);
		if (!compareArrayElements(availablePrimaryColumns, receivedPrimaryColumns)) {
			throw new HttpException({ message: Messages.PRIMARY_KEY_INVALID }, HttpStatus.BAD_REQUEST);
		}

		const builtTableSettings = buildDAOsTableSettingsDs(buildCommonTableSettingsInput(tableSettings), null);
		let rowData: Record<string, unknown>;
		try {
			rowData = await dao.getRowByPrimaryKey(tableName, primaryKey, builtTableSettings, userEmail);
		} catch (e) {
			throw new UnknownSQLException(getErrorMessage(e), ExceptionOperations.FAILED_TO_GET_ROW_BY_PRIMARY_KEY);
		}

		if (!rowData) {
			throw new HttpException({ message: Messages.ROW_PRIMARY_KEY_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}

		rowData = removePasswordsFromRowsUtil(rowData, tableWidgets);

		const allColumnNames = tableStructure.map((column) => column.column_name);
		const readableColumns = userId
			? await this.cedarPermissions.getReadableColumns(userId, connectionId, tableName, allColumnNames)
			: await this.cedarPermissions.getReadableColumnsForPublic(connectionId, tableName, allColumnNames);
		if (!isAllColumnsReadable(readableColumns, allColumnNames)) {
			rowData = filterRowByReadableColumns(rowData, readableColumns);
		}

		return { row: rowData };
	}
}
