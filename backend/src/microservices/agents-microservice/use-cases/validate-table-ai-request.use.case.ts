import { ForbiddenException, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { CedarAction } from '../../../entities/cedar-authorization/cedar-action-map.js';
import { CedarAuthorizationService } from '../../../entities/cedar-authorization/cedar-authorization.service.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidateTableAiRequestDs } from '../data-structures/agents.ds.js';
import { PermissionAllowedRO } from '../data-structures/agents-responses.ds.js';
import { IValidateTableAiRequest } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ValidateTableAiRequestUseCase
	extends AbstractUseCase<ValidateTableAiRequestDs, PermissionAllowedRO>
	implements IValidateTableAiRequest
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly cedarAuthService: CedarAuthorizationService,
	) {
		super();
	}

	protected async implementation(inputData: ValidateTableAiRequestDs): Promise<PermissionAllowedRO> {
		const { userId, connectionId, tableName } = inputData;

		const allowed = await this.cedarAuthService.validate({
			userId,
			action: CedarAction.TableAiRequest,
			connectionId,
			tableName,
		});

		if (!allowed) {
			throw new ForbiddenException(Messages.DONT_HAVE_PERMISSIONS);
		}

		return { allowed: true };
	}
}
