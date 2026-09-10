import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { validateConnection } from '../../../entities/table/utils/validate-connection.util.js';
import { TableActionEntity } from '../../../entities/table-actions/table-actions-module/table-action.entity.js';
import { TableActionActivationService } from '../../../entities/table-actions/table-actions-module/table-action-activation.service.js';
import { OperationResultStatusEnum } from '../../../enums/operation-result-status.enum.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { ConnectionNotFoundException } from '../../../exceptions/custom-exceptions/connection-not-found-exception.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { SitenovaRowEventDs } from '../data-structures/sitenova.ds.js';
import { SitenovaRowEventRO } from '../data-structures/sitenova-internal-responses.ds.js';
import { ISitenovaActivateRowEventActions } from './sitenova-use-cases.interface.js';

// The universal-backend → core row-event bridge (plan 37). A generated-site visitor's write never
// passes through the core's own row use cases (universal-backend runs the query itself), so the
// table actions the connection owner configured in RocketAdmin ("on new row in orders → Slack")
// would never fire for visitor traffic. universal-backend reports every write here; THIS use case
// decides whether anything runs: only the actions the owner attached to this table + event — the
// same lookup AddRow/UpdateRow/DeleteRowInTableUseCase perform — and nothing when there are none.
//
// Trust: the caller is a satellite (microservice JWT), and the write it reports was already
// authorized against the site manifest on its side. Nothing here re-checks Cedar — the actions run
// under the owner's configuration, on the owner's behalf, exactly as they would for an admin-panel
// write. The actor is reported as a site visitor, never as a RocketAdmin user.
//
// Failure model: one action failing must not hide the others, and no failure is the visitor's
// problem — the outcome is reported per action and logged, never thrown (the write already
// happened). Mirrors activateTableActions(), which swallows per-action errors on the admin path.
@Injectable()
export class SitenovaActivateRowEventActionsUseCase
	extends AbstractUseCase<SitenovaRowEventDs, SitenovaRowEventRO>
	implements ISitenovaActivateRowEventActions
{
	private readonly logger = new Logger(SitenovaActivateRowEventActionsUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly tableActionActivationService: TableActionActivationService,
	) {
		super();
	}

	protected async implementation(inputData: SitenovaRowEventDs): Promise<SitenovaRowEventRO> {
		const { connectionId, tableName, event, primaryKeys, visitor } = inputData;

		// "Process only if added in RocketAdmin": no configured action ⇒ nothing to do, and the
		// connection is not even decrypted. This is the hot path — every visitor write lands here.
		const tableActions = await this.findActionsForEvent(connectionId, tableName, event);
		if (!tableActions.length) {
			return { actionsMatched: 0, activationResults: [] };
		}

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, '');
		if (!foundConnection) {
			throw new ConnectionNotFoundException(HttpStatus.NOT_FOUND);
		}
		validateConnection(foundConnection);

		const triggerOperation = TableActionEventEnum[event];
		const activationResults: Array<{ actionId: string; result: OperationResultStatusEnum }> = [];
		for (const tableAction of tableActions) {
			try {
				const { receivedOperationResult } = await this.tableActionActivationService.activateTableActionForVisitor(
					tableAction,
					foundConnection,
					primaryKeys,
					{ visitorId: visitor.uid, email: visitor.email },
					tableName,
					triggerOperation,
				);
				activationResults.push({ actionId: tableAction.id, result: receivedOperationResult });
			} catch (error) {
				// A 4xx/5xx from the owner's webhook URL, an unreachable Slack hook, a mail failure — the
				// owner's integration problem, reported back to universal-backend's log line, not thrown.
				this.logger.warn(
					`Table action ${tableAction.id} (${tableAction.method}) failed for visitor ${event} on ` +
						`connection=${connectionId} table=${tableName}: ${getErrorMessage(error)}`,
				);
				activationResults.push({ actionId: tableAction.id, result: OperationResultStatusEnum.unsuccessfully });
			}
		}
		return { actionsMatched: tableActions.length, activationResults };
	}

	private async findActionsForEvent(
		connectionId: string,
		tableName: string,
		event: SitenovaRowEventDs['event'],
	): Promise<Array<TableActionEntity>> {
		switch (event) {
			case 'ADD_ROW':
				return await this._dbContext.tableActionRepository.findTableActionsWithAddRowEvents(connectionId, tableName);
			case 'UPDATE_ROW':
				return await this._dbContext.tableActionRepository.findTableActionsWithUpdateRowEvents(connectionId, tableName);
			case 'DELETE_ROW':
				return await this._dbContext.tableActionRepository.findTableActionsWithDeleteRowEvents(connectionId, tableName);
			default:
				return [];
		}
	}
}
