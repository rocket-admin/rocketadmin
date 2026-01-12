import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { UpdateSavedDbQueryDs } from '../data-structures/update-saved-db-query.ds.js';
import { FoundSavedDbQueryDto } from '../dto/found-saved-db-query.dto.js';
import { buildFoundSavedDbQueryDto } from '../utils/build-found-saved-db-query-dto.util.js';
import { IUpdateSavedDbQuery } from './saved-db-query-use-cases.interface.js';
import { SavedDbQueryEntity } from '../saved-db-query.entity.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateSavedDbQueryUseCase
	extends AbstractUseCase<UpdateSavedDbQueryDs, FoundSavedDbQueryDto>
	implements IUpdateSavedDbQuery
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: UpdateSavedDbQueryDs): Promise<FoundSavedDbQueryDto> {
		const { queryId, connectionId, masterPassword, name, description, query_text } = inputData;

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

		if (name !== undefined) {
			foundQuery.name = name;
		}
		if (description !== undefined) {
			foundQuery.description = description;
		}
		if (query_text !== undefined) {
			foundQuery.query_text = query_text;
		}
		const resultQueryText = foundQuery.query_text;
		const savedQuery = await this._dbContext.savedDbQueryRepository.save(foundQuery);
		const savedQueryCopy = { ...savedQuery };
		savedQueryCopy.query_text = resultQueryText;
		return buildFoundSavedDbQueryDto(savedQueryCopy as SavedDbQueryEntity);
	}
}
