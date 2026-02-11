import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { CreateSavedDbQueryDs } from '../data-structures/create-saved-db-query.ds.js';
import { FoundSavedDbQueryDto } from '../dto/found-saved-db-query.dto.js';
import { SavedDbQueryEntity } from '../saved-db-query.entity.js';
import { buildFoundSavedDbQueryDto } from '../utils/build-found-saved-db-query-dto.util.js';
import { validateQuerySafety } from '../utils/check-query-is-safe.util.js';
import { ICreateSavedDbQuery } from './saved-db-query-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreateSavedDbQueryUseCase
	extends AbstractUseCase<CreateSavedDbQueryDs, FoundSavedDbQueryDto>
	implements ICreateSavedDbQuery
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: CreateSavedDbQueryDs): Promise<FoundSavedDbQueryDto> {
		const { connectionId, masterPassword, name, description, widget_type, chart_type, widget_options, query_text } =
			inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		validateQuerySafety(query_text, foundConnection.type as ConnectionTypesEnum);

		const newQuery = new SavedDbQueryEntity();
		newQuery.name = name;
		newQuery.description = description || null;
		newQuery.widget_type = widget_type;
		newQuery.chart_type = chart_type || null;
		newQuery.widget_options = widget_options ? (widget_options as unknown as string) : null;
		newQuery.query_text = query_text;
		newQuery.connection_id = foundConnection.id;

		const savedQuery = await this._dbContext.savedDbQueryRepository.save(newQuery);
		const savedQueryCopy = { ...savedQuery };
		savedQueryCopy.query_text = query_text;
		return buildFoundSavedDbQueryDto(savedQueryCopy as SavedDbQueryEntity);
	}
}
