import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
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
import { isObjectEmpty } from '../../../../helpers/is-object-empty.js';
import { buildCommonTableSettingsInput } from '../../utils/build-common-table-settings-input.util.js';
import { convertHexDataInPrimaryKeyUtil } from '../../utils/convert-hex-data-in-primary-key.util.js';
import { convertHexDataInRowUtil } from '../../utils/convert-hex-data-in-row.util.js';
import { hashPasswordsInRowUtil } from '../../utils/hash-passwords-in-row.util.js';
import { processUuidsInRowUtil } from '../../utils/process-uuids-in-row-util.js';
import { removePasswordsFromRowsUtil } from '../../utils/remove-password-from-row.util.js';
import { getUserEmailForAgent, validateConnection } from '../../utils/validate-connection.util.js';
import { PureCrudRowResponseDs } from '../application/data-structures/pure-crud-row-response.ds.js';
import { PureUpdateRowDs } from '../application/data-structures/pure-update-row.ds.js';
import { IPureUpdateRowInTable } from './table-pure-crud-use-cases.interface.js';

@Injectable()
export class PureUpdateRowInTableUseCase
	extends AbstractUseCase<PureUpdateRowDs, PureCrudRowResponseDs>
	implements IPureUpdateRowInTable
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: PureUpdateRowDs): Promise<PureCrudRowResponseDs> {
		const { connectionId, masterPwd, tableName, userId } = inputData;
		let { primaryKey, row } = inputData;
		if (!primaryKey) {
			throw new PrimaryKeyMissingException();
		}

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);

		const dao = getDataAccessObject(connection);
		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

		const isView = await dao.isView(tableName, userEmail);
		if (isView) {
			throw new HttpException({ message: Messages.CANT_UPDATE_TABLE_VIEW }, HttpStatus.BAD_REQUEST);
		}

		const [tableStructure, tableWidgets, tableSettings, tablePrimaryKeys] = await Promise.all([
			dao.getTableStructure(tableName, userEmail),
			this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
			this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
			dao.getTablePrimaryColumns(tableName, userEmail),
		]);

		if (tableSettings && !tableSettings.can_update) {
			throw new HttpException({ message: Messages.CANT_DO_TABLE_OPERATION }, HttpStatus.FORBIDDEN);
		}

		primaryKey = convertHexDataInPrimaryKeyUtil(primaryKey, tableStructure);
		const availablePrimaryColumns = tablePrimaryKeys.map((key) => key.column_name);
		for (const key in primaryKey) {
			// eslint-disable-next-line security/detect-object-injection
			if (!primaryKey[key] && primaryKey[key] !== '') delete primaryKey[key];
		}
		const receivedPrimaryColumns = Object.keys(primaryKey);
		if (!compareArrayElements(availablePrimaryColumns, receivedPrimaryColumns)) {
			throw new HttpException({ message: Messages.PRIMARY_KEY_INVALID }, HttpStatus.BAD_REQUEST);
		}

		const builtTableSettings = buildDAOsTableSettingsDs(buildCommonTableSettingsInput(tableSettings), null);
		let oldRowData: Record<string, unknown>;
		try {
			oldRowData = await dao.getRowByPrimaryKey(tableName, primaryKey, builtTableSettings, userEmail);
		} catch (e) {
			throw new UnknownSQLException(getErrorMessage(e), ExceptionOperations.FAILED_TO_UPDATE_ROW_IN_TABLE);
		}
		if (!oldRowData) {
			throw new HttpException({ message: Messages.ROW_PRIMARY_KEY_NOT_FOUND }, HttpStatus.BAD_REQUEST);
		}

		const futureRowData = Object.assign({ ...oldRowData }, row);
		let futurePrimaryKey: Record<string, unknown> = {};
		for (const primaryColumn of tablePrimaryKeys) {
			futurePrimaryKey[primaryColumn.column_name] = futureRowData[primaryColumn.column_name];
		}
		if (isObjectEmpty(futurePrimaryKey)) {
			futurePrimaryKey = primaryKey;
		}

		try {
			row = await hashPasswordsInRowUtil(row, tableWidgets);
			row = processUuidsInRowUtil(row, tableWidgets);
			row = convertHexDataInRowUtil(row, tableStructure);
			await dao.updateRowInTable(tableName, row, primaryKey, userEmail);
			let updatedRow = await dao.getRowByPrimaryKey(tableName, futurePrimaryKey, builtTableSettings, userEmail);
			updatedRow = removePasswordsFromRowsUtil(updatedRow, tableWidgets);
			return { row: updatedRow };
		} catch (e) {
			throw new UnknownSQLException(getErrorMessage(e), ExceptionOperations.FAILED_TO_UPDATE_ROW_IN_TABLE);
		}
	}
}
