import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
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
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { toPrettyErrorsMsg } from '../../../helpers/to-pretty-errors-msg.js';
import { UpdateAiRowsDs } from '../data-structures/agents.ds.js';
import { AiRowsUpdatedRO } from '../data-structures/agents-responses.ds.js';
import { setupAiConnection } from '../utils/ai-data-access.helpers.js';
import {
	assertUserCanWriteTable,
	loadRowsForAiPrimaryKeys,
	normalizeAiPrimaryKeys,
	prepareAiTableWrite,
	primaryKeyIndexKey,
} from '../utils/ai-row-write.helpers.js';
import { IUpdateAiRows } from './agents-use-cases.interface.js';

// Updates rows by primary key on behalf of a RocketAdmin user for the SiteNova chat data agent
// (sitenova plan 85). One set of new values goes to every listed row. The steps mirror
// BulkUpdateRowsInTableUseCase: the Cedar table:edit check, the key validation, the old rows for
// the audit log, the password / uuid / binary processing and one bulk UPDATE. The UPDATE_ROW table
// actions fire per row, as on the panel's single-row route. A key that names no row refuses the
// whole call before any write.
@Injectable({ scope: Scope.REQUEST })
export class UpdateAiRowsUseCase extends AbstractUseCase<UpdateAiRowsDs, AiRowsUpdatedRO> implements IUpdateAiRows {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
		private readonly tableLogsService: TableLogsService,
		private readonly tableActionActivationService: TableActionActivationService,
	) {
		super();
	}

	protected async implementation(inputData: UpdateAiRowsDs): Promise<AiRowsUpdatedRO> {
		const { connectionId, userId, masterPassword, tableName, newValues } = inputData;

		const {
			foundConnection,
			dataAccessObject: dao,
			userEmail,
		} = await setupAiConnection(this._dbContext, connectionId, masterPassword, userId);
		await assertUserCanWriteTable(this.cedarAuthService, 'update', userId, connectionId, tableName);
		const context = await prepareAiTableWrite(this._dbContext, dao, connectionId, tableName, userEmail, 'update');
		const primaryKeys = normalizeAiPrimaryKeys(inputData.primaryKeys, context);

		const errors = validateTableRowUtil(newValues, context.tableStructure);
		if (errors.length > 0) {
			throw new HttpException({ message: toPrettyErrorsMsg(errors) }, HttpStatus.BAD_REQUEST);
		}
		const oldRowsByKey = await loadRowsForAiPrimaryKeys(dao, tableName, primaryKeys, context, userEmail);

		let processedValues = await hashPasswordsInRowUtil(newValues, context.tableWidgets);
		processedValues = processUuidsInRowUtil(processedValues, context.tableWidgets);
		processedValues = convertHexDataInRowUtil(processedValues, context.tableStructure);

		let operationResult = OperationResultStatusEnum.unknown;
		try {
			await dao.bulkUpdateRowsInTable(tableName, processedValues, primaryKeys, userEmail);
			operationResult = OperationResultStatusEnum.successfully;
		} catch (error) {
			operationResult = OperationResultStatusEnum.unsuccessfully;
			throw new HttpException({ message: getErrorMessage(error) }, HttpStatus.BAD_REQUEST);
		} finally {
			await this.tableLogsService.createAndSaveNewLogsUtil(
				primaryKeys.map((primaryKey) => ({
					operationStatusResult: operationResult,
					row: { ...newValues },
					old_data: { ...(oldRowsByKey.get(primaryKeyIndexKey(primaryKey, context.primaryColumnNames)) ?? {}) },
					affected_primary_key: primaryKey as unknown as string,
				})),
				userId,
				foundConnection,
				tableName,
				LogOperationTypeEnum.updateRow,
			);
		}

		const updateActions = await this._dbContext.tableActionRepository.findTableActionsWithUpdateRowEvents(
			connectionId,
			tableName,
		);
		for (const primaryKey of primaryKeys) {
			await this.tableActionActivationService.activateTableActions(
				updateActions,
				foundConnection,
				primaryKey,
				userId,
				tableName,
				TableActionEventEnum.UPDATE_ROW,
			);
		}

		return { updatedCount: primaryKeys.length };
	}
}
