import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { buildDAOsTableSettingsDs } from '@rocketadmin/shared-code/dist/src/helpers/data-structures-builders/table-settings.ds.builder.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { TableNotFoundException } from '../../../../exceptions/custom-exceptions/table-not-found-exception.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { getErrorMessage } from '../../../../helpers/get-error-message.js';
import { isObjectEmpty } from '../../../../helpers/is-object-empty.js';
import { toPrettyErrorsMsg } from '../../../../helpers/to-pretty-errors-msg.js';
import { buildCommonTableSettingsInput } from '../../utils/build-common-table-settings-input.util.js';
import { convertHexDataInRowUtil } from '../../utils/convert-hex-data-in-row.util.js';
import { hashPasswordsInRowUtil } from '../../utils/hash-passwords-in-row.util.js';
import { processUuidsInRowUtil } from '../../utils/process-uuids-in-row-util.js';
import { removePasswordsFromRowsUtil } from '../../utils/remove-password-from-row.util.js';
import { getUserEmailForAgent, validateConnection } from '../../utils/validate-connection.util.js';
import { validateTableRowUtil } from '../../utils/validate-table-row.util.js';
import { PureCreateRowDs } from '../application/data-structures/pure-create-row.ds.js';
import { PureCrudRowResponseDs } from '../application/data-structures/pure-crud-row-response.ds.js';
import { IPureCreateRowInTable } from './table-pure-crud-use-cases.interface.js';

@Injectable()
export class PureCreateRowInTableUseCase
	extends AbstractUseCase<PureCreateRowDs, PureCrudRowResponseDs>
	implements IPureCreateRowInTable
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: PureCreateRowDs): Promise<PureCrudRowResponseDs> {
		const { connectionId, masterPwd, tableName, userId } = inputData;
		let { row } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
		validateConnection(connection);

		const dao = getDataAccessObject(connection);
		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

		const tablesInConnection = await dao.getTablesFromDB(userEmail);
		const isTableInConnection = tablesInConnection.some((el) => el.tableName === tableName);
		if (!isTableInConnection) {
			throw new TableNotFoundException();
		}

		const isView = await dao.isView(tableName, userEmail);
		if (isView) {
			throw new HttpException({ message: Messages.CANT_UPDATE_TABLE_VIEW }, HttpStatus.BAD_REQUEST);
		}

		const [tableStructure, tableWidgets, tableSettings] = await Promise.all([
			dao.getTableStructure(tableName, userEmail),
			this._dbContext.tableWidgetsRepository.findTableWidgets(connectionId, tableName),
			this._dbContext.tableSettingsRepository.findTableSettings(connectionId, tableName),
		]);

		if (tableSettings && !tableSettings.can_add) {
			throw new HttpException({ message: Messages.CANT_DO_TABLE_OPERATION }, HttpStatus.FORBIDDEN);
		}

		const errors = validateTableRowUtil(row, tableStructure);
		if (errors.length > 0) {
			throw new HttpException({ message: toPrettyErrorsMsg(errors) }, HttpStatus.BAD_REQUEST);
		}

		const builtTableSettings = buildDAOsTableSettingsDs(buildCommonTableSettingsInput(tableSettings), null);
		try {
			row = await hashPasswordsInRowUtil(row, tableWidgets);
			row = processUuidsInRowUtil(row, tableWidgets);
			row = convertHexDataInRowUtil(row, tableStructure);
			const addedRowPrimaryKey = (await dao.addRowInTable(tableName, row, userEmail)) as Record<string, unknown>;
			if (!addedRowPrimaryKey || isObjectEmpty(addedRowPrimaryKey)) {
				return { row };
			}
			let addedRow = await dao.getRowByPrimaryKey(tableName, addedRowPrimaryKey, builtTableSettings, userEmail);
			addedRow = removePasswordsFromRowsUtil(addedRow, tableWidgets);
			return { row: addedRow };
		} catch (e) {
			throw new HttpException(
				{
					message: getErrorMessage(e).includes('duplicate key value')
						? Messages.CANT_INSERT_DUPLICATE_KEY
						: `${Messages.FAILED_ADD_ROW_IN_TABLE} ${Messages.ERROR_MESSAGE} ${getErrorMessage(e)} ${Messages.TRY_AGAIN_LATER}`,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
	}
}
