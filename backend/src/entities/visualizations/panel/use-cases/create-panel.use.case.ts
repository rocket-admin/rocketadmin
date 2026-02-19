import { Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import AbstractUseCase from '../../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import { Messages } from '../../../../exceptions/text/messages.js';
import { CreatePanelDs } from '../data-structures/create-panel.ds.js';
import { FoundPanelDto } from '../dto/found-saved-db-query.dto.js';
import { PanelEntity } from '../panel.entity.js';
import { buildFoundPanelDto } from '../utils/build-found-panel-dto.util.js';
import { validateQuerySafety } from '../utils/check-query-is-safe.util.js';
import { ICreatePanel } from './panel-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class CreatePanelUseCase extends AbstractUseCase<CreatePanelDs, FoundPanelDto> implements ICreatePanel {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	public async implementation(inputData: CreatePanelDs): Promise<FoundPanelDto> {
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

		const newQuery = new PanelEntity();
		newQuery.name = name;
		newQuery.description = description || null;
		newQuery.panel_type = widget_type;
		newQuery.chart_type = chart_type || null;
		newQuery.panel_options = widget_options ? (widget_options as unknown as string) : null;
		newQuery.query_text = query_text;
		newQuery.connection_id = foundConnection.id;

		const savedQuery = await this._dbContext.panelRepository.save(newQuery);
		const savedQueryCopy = { ...savedQuery };
		savedQueryCopy.query_text = query_text;
		return buildFoundPanelDto(savedQueryCopy as PanelEntity);
	}
}
