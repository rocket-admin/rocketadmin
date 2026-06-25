import { Inject, Injectable } from '@nestjs/common';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getUserEmailForAgent, validateConnection } from '../../../entities/table/utils/validate-connection.util.js';
import { SitenovaExecuteRawQueryDs } from '../data-structures/sitenova.ds.js';
import { SitenovaRawQueryResultRO } from '../data-structures/sitenova-responses.ds.js';
import { ISitenovaExecuteRawQuery } from './sitenova-use-cases.interface.js';

@Injectable()
export class SitenovaExecuteRawQueryUseCase
	extends AbstractUseCase<SitenovaExecuteRawQueryDs, SitenovaRawQueryResultRO>
	implements ISitenovaExecuteRawQuery
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: SitenovaExecuteRawQueryDs): Promise<SitenovaRawQueryResultRO> {
		const { connectionId, masterPassword, userId, query, tableName } = inputData;

		const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword as string,
		);
		validateConnection(connection);

		const dao = getDataAccessObject(connection);
		const userEmail = await getUserEmailForAgent(connection, userId, this._dbContext.userRepository);

		// Intentionally write-capable: unlike the AI read path there is no read-only
		// validation, no LIMIT wrapping and no Cedar permission check. The caller is
		// authorized by the microservice JWT and is constrained only by the privileges
		// of the connected database user, so it can run DDL/DML such as CREATE TABLE.
		const result = await dao.executeRawQuery(query, tableName ?? '', userEmail);

		return { result };
	}
}
