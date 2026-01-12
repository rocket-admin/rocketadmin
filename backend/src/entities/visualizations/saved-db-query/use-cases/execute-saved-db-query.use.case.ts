import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { ExecuteSavedDbQueryDs } from '../data-structures/execute-saved-db-query.ds.js';
import { ExecuteSavedDbQueryResultDto } from '../dto/execute-saved-db-query-result.dto.js';
import { IExecuteSavedDbQuery } from './saved-db-query-use-cases.interface.js';
import { isConnectionTypeAgent } from '../../../../helpers/is-connection-entity-agent.js';

@Injectable({ scope: Scope.REQUEST })
export class ExecuteSavedDbQueryUseCase
	extends AbstractUseCase<ExecuteSavedDbQueryDs, ExecuteSavedDbQueryResultDto>
	implements IExecuteSavedDbQuery
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: ExecuteSavedDbQueryDs): Promise<ExecuteSavedDbQueryResultDto> {
		const { queryId, connectionId, masterPassword, tableName, userId } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundQuery = await this._dbContext.savedDbQueryRepository.findQueryByIdAndConnectionId(queryId, connectionId);

		if (!foundQuery) {
			throw new NotFoundException(Messages.SAVED_QUERY_NOT_FOUND);
		}

		let userEmail: string | null = null;
		if (isConnectionTypeAgent(foundConnection.type)) {
			userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
		}

		const dao = getDataAccessObject(foundConnection);
		const startTime = Date.now();

		const executionResult = await dao.executeRawQuery(foundQuery.query_text, tableName, userEmail);
		const processedResult = this.processQueryResult(executionResult, foundConnection.type as ConnectionTypesEnum);

		const executionTime = Date.now() - startTime;

		return {
			query_id: foundQuery.id,
			query_name: foundQuery.name,
			data: processedResult,
			execution_time_ms: executionTime,
		};
	}

	private processQueryResult(result: unknown, connectionType: ConnectionTypesEnum): Array<Record<string, unknown>> {
		if (!result) {
			return [];
		}
		if (connectionType === ConnectionTypesEnum.postgres || connectionType === ConnectionTypesEnum.agent_postgres) {
			if (result && typeof result === 'object' && 'rows' in result) {
				return (result as { rows: Array<Record<string, unknown>> }).rows;
			}
		}

		if (connectionType === ConnectionTypesEnum.mysql || connectionType === ConnectionTypesEnum.agent_mysql) {
			if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) {
				return result[0];
			}
		}
		if (Array.isArray(result)) {
			return result;
		}
		return [];
	}
}
