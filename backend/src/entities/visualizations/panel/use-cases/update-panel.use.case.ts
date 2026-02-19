import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { UpdatePanelDs } from '../data-structures/update-panel.ds.js';
import { FoundPanelDto } from '../dto/found-saved-db-query.dto.js';
import { PanelEntity } from '../panel.entity.js';
import { buildFoundPanelDto } from '../utils/build-found-panel-dto.util.js';
import { validateQuerySafety } from '../utils/check-query-is-safe.util.js';
import { IUpdatePanel } from './panel-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class UpdateSavedDbQueryUseCase extends AbstractUseCase<UpdatePanelDs, FoundPanelDto> implements IUpdatePanel {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: UpdatePanelDs): Promise<FoundPanelDto> {
		const {
			queryId,
			connectionId,
			masterPassword,
			name,
			description,
			widget_type,
			chart_type,
			widget_options,
			query_text,
		} = inputData;

		const foundConnection = await this._dbContext.connectionRepository.findAndDecryptConnection(
			connectionId,
			masterPassword,
		);

		if (!foundConnection) {
			throw new NotFoundException(Messages.CONNECTION_NOT_FOUND);
		}

		const foundQuery = await this._dbContext.panelRepository.findQueryByIdAndConnectionId(queryId, connectionId);

		if (!foundQuery) {
			throw new NotFoundException(Messages.SAVED_QUERY_NOT_FOUND);
		}

		if (name !== undefined) {
			foundQuery.name = name;
		}
		if (description !== undefined) {
			foundQuery.description = description;
		}
		if (widget_type !== undefined) {
			foundQuery.panel_type = widget_type;
		}
		if (chart_type !== undefined) {
			foundQuery.chart_type = chart_type;
		}
		if (widget_options !== undefined) {
			foundQuery.panel_options = widget_options ? (widget_options as unknown as string) : null;
		}
		if (query_text !== undefined) {
			validateQuerySafety(query_text, foundConnection.type as ConnectionTypesEnum);
			foundQuery.query_text = query_text;
		}
		const resultQueryText = foundQuery.query_text;
		const savedQuery = await this._dbContext.panelRepository.save(foundQuery);
		const savedQueryCopy = { ...savedQuery };
		savedQueryCopy.query_text = resultQueryText;
		return buildFoundPanelDto(savedQueryCopy as PanelEntity);
	}
}
