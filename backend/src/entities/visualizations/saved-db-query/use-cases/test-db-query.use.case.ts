import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../../helpers/is-connection-entity-agent.js';
import { TestDbQueryDs } from '../data-structures/test-db-query.ds.js';
import { TestDbQueryResultDto } from '../dto/test-db-query-result.dto.js';
import { validateQuerySafety } from '../utils/check-query-is-safe.util.js';
import { ITestDbQuery } from './saved-db-query-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class TestDbQueryUseCase extends AbstractUseCase<TestDbQueryDs, TestDbQueryResultDto> implements ITestDbQuery {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: TestDbQueryDs): Promise<TestDbQueryResultDto> {
		const { connectionId, masterPassword, query_text, tableName, userId } = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		validateQuerySafety(query_text, foundConnection.type as ConnectionTypesEnum);

		let userEmail: string | null = null;
		if (isConnectionTypeAgent(foundConnection.type)) {
			userEmail = await this._dbContext.userRepository.getUserEmailOrReturnNull(userId);
		}

		const dao = getDataAccessObject(foundConnection);
		const startTime = Date.now();

		const executionResult = await dao.executeRawQuery(query_text, tableName, userEmail);
		const processedResult = this.processQueryResult(executionResult, foundConnection.type as ConnectionTypesEnum);

		const executionTime = Date.now() - startTime;

		return {
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
