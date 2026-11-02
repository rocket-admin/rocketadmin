import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { convertHexDataInRowUtil } from '../../../entities/table/utils/convert-hex-data-in-row.util.js';
import { hashPasswordsInRowUtil } from '../../../entities/table/utils/hash-passwords-in-row.util.js';
import { processUuidsInRowUtil } from '../../../entities/table/utils/process-uuids-in-row-util.js';
import { validateTableRowUtil } from '../../../entities/table/utils/validate-table-row.util.js';
import { TableActionActivationService } from '../../../entities/table-actions/table-actions-module/table-action-activation.service.js';
import { TableLogsService } from '../../../entities/table-logs/table-logs.service.js';
import { LogOperationTypeEnum } from '../../../enums/log-operation-type.enum.js';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { isObjectEmpty } from '../../../helpers/is-object-empty.js';
import { toPrettyErrorsMsg } from '../../../helpers/to-pretty-errors-msg.js';
import { InsertAiRowsDs } from '../data-structures/agents.ds.js';
import { AiRowsInsertedRO } from '../data-structures/agents-responses.ds.js';
import { setupAiConnection } from '../utils/ai-data-access.helpers.js';
import { assertUserCanWriteTable, prepareAiTableWrite } from '../utils/ai-row-write.helpers.js';
import { IInsertAiRows } from './agents-use-cases.interface.js';

// Inserts rows on behalf of a RocketAdmin user for the SiteNova chat data agent (sitenova plan
// 85). The steps mirror AddRowInTableUseCase: the Cedar table:add check, the row validation, the
// password / uuid / binary processing, one audit-log row per insert and the ADD_ROW table actions.
// The rows go in one by one, in request order. The first failure stops the call, and the response
// says how many rows went in before it, so the agent can report the exact result.
@Injectable({ scope: Scope.REQUEST })
export class InsertAiRowsUseCase extends AbstractUseCase<InsertAiRowsDs, AiRowsInsertedRO> implements IInsertAiRows {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
		private readonly tableLogsService: TableLogsService,
		private readonly tableActionActivationService: TableActionActivationService,
	) {
		super();
	}

	protected async implementation(inputData: InsertAiRowsDs): Promise<AiRowsInsertedRO> {
		const { connectionId, userId, masterPassword, tableName, rows } = inputData;

		const {
			foundConnection,
			dataAccessObject: dao,
			userEmail,
		} = await setupAiConnection(this._dbContext, connectionId, masterPassword, userId);
		await assertUserCanWriteTable(this.cedarAuthService, 'add', userId, connectionId, tableName);
		const context = await prepareAiTableWrite(this._dbContext, dao, connectionId, tableName, userEmail, 'add');

		const addActions = await this._dbContext.tableActionRepository.findTableActionsWithAddRowEvents(
			connectionId,
			tableName,
		);

		const insertedPrimaryKeys: Array<Record<string, unknown>> = [];
		const logs: Array<{
			operationStatusResult: OperationResultStatusEnum;
			row: Record<string, unknown>;
			old_data: Record<string, unknown>;
			affected_primary_key: string;
		}> = [];
		let failure: AiRowsInsertedRO['failure'];

		try {
			for (const [rowIndex, row] of rows.entries()) {
				const errors = validateTableRowUtil(row, context.tableStructure);
				if (errors.length > 0) {
					failure = { rowIndex, message: toPrettyErrorsMsg(errors) };
					break;
				}
				let processedRow = await hashPasswordsInRowUtil(row, context.tableWidgets);
				processedRow = processUuidsInRowUtil(processedRow, context.tableWidgets);
				processedRow = convertHexDataInRowUtil(processedRow, context.tableStructure);
				let primaryKey: Record<string, unknown>;
				try {
					primaryKey = (await dao.addRowInTable(tableName, processedRow, userEmail)) as Record<string, unknown>;
				} catch (error) {
					const message = getErrorMessage(error);
					failure = {
						rowIndex,
						message: message.includes('duplicate key value') ? Messages.CANT_INSERT_DUPLICATE_KEY : message,
					};
					logs.push({
						operationStatusResult: OperationResultStatusEnum.unsuccessfully,
						row: processedRow,
						old_data: {},
						affected_primary_key: '' as string,
					});
					break;
				}
				const affectedPrimaryKey = primaryKey && !isObjectEmpty(primaryKey) ? primaryKey : {};
				insertedPrimaryKeys.push(affectedPrimaryKey);
				logs.push({
					operationStatusResult: OperationResultStatusEnum.successfully,
					row: processedRow,
					old_data: {},
					affected_primary_key: affectedPrimaryKey as unknown as string,
				});
				if (addActions.length > 0) {
					const addedRow = isObjectEmpty(affectedPrimaryKey)
						? processedRow
						: await dao.getRowByPrimaryKey(tableName, affectedPrimaryKey, context.daoTableSettings, userEmail);
					await this.tableActionActivationService.activateTableActions(
						addActions,
						foundConnection,
						addedRow ?? processedRow,
						userId,
						tableName,
						TableActionEventEnum.ADD_ROW,
					);
				}
			}
		} finally {
			if (logs.length > 0) {
				await this.tableLogsService.createAndSaveNewLogsUtil(
					logs,
					userId,
					foundConnection,
					tableName,
					LogOperationTypeEnum.addRow,
				);
			}
		}

		return {
			insertedCount: insertedPrimaryKeys.length,
			insertedPrimaryKeys,
			...(failure ? { failure } : {}),
		};
	}
}
