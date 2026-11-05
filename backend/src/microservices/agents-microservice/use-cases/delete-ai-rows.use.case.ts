import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { TableActionActivationService } from '../../../entities/table-actions/table-actions-module/table-action-activation.service.js';
import { TableLogsService } from '../../../entities/table-logs/table-logs.service.js';
import { LogOperationTypeEnum } from '../../../enums/log-operation-type.enum.js';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { DeleteAiRowsDs } from '../data-structures/agents.ds.js';
import { AiRowsDeletedRO } from '../data-structures/agents-responses.ds.js';
import { setupAiConnection } from '../utils/ai-data-access.helpers.js';
import {
	assertUserCanWriteTable,
	loadRowsForAiPrimaryKeys,
	normalizeAiPrimaryKeys,
	prepareAiTableWrite,
	primaryKeyIndexKey,
} from '../utils/ai-row-write.helpers.js';
import { IDeleteAiRows } from './agents-use-cases.interface.js';

// Deletes rows by primary key on behalf of a RocketAdmin user for the SiteNova chat data agent
// (sitenova plan 85). The steps mirror DeleteRowsFromTableUseCase (plan 75): the Cedar
// table:delete check, the key validation, the old rows for the audit log and one bulk DELETE. The
// DELETE_ROW table actions fire per row, as on the panel's single-row route. A key that names no
// row refuses the whole call before any write.
@Injectable({ scope: Scope.REQUEST })
export class DeleteAiRowsUseCase extends AbstractUseCase<DeleteAiRowsDs, AiRowsDeletedRO> implements IDeleteAiRows {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
		private readonly tableLogsService: TableLogsService,
		private readonly tableActionActivationService: TableActionActivationService,
	) {
		super();
	}

	protected async implementation(inputData: DeleteAiRowsDs): Promise<AiRowsDeletedRO> {
		const { connectionId, userId, masterPassword, tableName } = inputData;

		const {
			foundConnection,
			dataAccessObject: dao,
			userEmail,
		} = await setupAiConnection(this._dbContext, connectionId, masterPassword, userId);
		await assertUserCanWriteTable(this.cedarAuthService, 'delete', userId, connectionId, tableName);
		const context = await prepareAiTableWrite(this._dbContext, dao, connectionId, tableName, userEmail, 'delete');
		const primaryKeys = normalizeAiPrimaryKeys(inputData.primaryKeys, context);
		const oldRowsByKey = await loadRowsForAiPrimaryKeys(dao, tableName, primaryKeys, context, userEmail);

		let operationResult = OperationResultStatusEnum.unknown;
		let deletedCount = 0;
		try {
			deletedCount = await dao.bulkDeleteRowsInTable(tableName, primaryKeys, userEmail);
			operationResult = OperationResultStatusEnum.successfully;
		} catch (error) {
			operationResult = OperationResultStatusEnum.unsuccessfully;
			throw new HttpException({ message: getErrorMessage(error) }, HttpStatus.BAD_REQUEST);
		} finally {
			await this.tableLogsService.createAndSaveNewLogsUtil(
				primaryKeys.map((primaryKey) => ({
					operationStatusResult: operationResult,
					row: { ...primaryKey },
					old_data: { ...(oldRowsByKey.get(primaryKeyIndexKey(primaryKey, context.primaryColumnNames)) ?? {}) },
					affected_primary_key: primaryKey as unknown as string,
				})),
				userId,
				foundConnection,
				tableName,
				LogOperationTypeEnum.deleteRow,
			);
		}

		const deleteActions = await this._dbContext.tableActionRepository.findTableActionsWithDeleteRowEvents(
			connectionId,
			tableName,
		);
		for (const primaryKey of primaryKeys) {
			await this.tableActionActivationService.activateTableActions(
				deleteActions,
				foundConnection,
				primaryKey,
				userId,
				tableName,
				TableActionEventEnum.DELETE_ROW,
			);
		}

		// Some drivers report no count for a bulk DELETE. Every key was verified to exist above, so
		// the request size is the honest fallback.
		return { deletedCount: typeof deletedCount === 'number' && deletedCount > 0 ? deletedCount : primaryKeys.length };
	}
}
