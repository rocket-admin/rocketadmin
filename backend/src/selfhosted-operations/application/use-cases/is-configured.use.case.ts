import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { IsConfiguredRo } from '../responce-objects/is-configured.ro.js';
import { IIsConfiguredUseCase } from './selfhosted-use-cases.interfaces.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';

@Injectable()
export class IsConfiguredUseCase extends AbstractUseCase<void, IsConfiguredRo> implements IIsConfiguredUseCase {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(): Promise<IsConfiguredRo> {
		if (isSaaS()) {
			return { isConfigured: true };
		}
		const userCount = await this._dbContext.userRepository.count();
		return { isConfigured: userCount > 0 };
	}
}
