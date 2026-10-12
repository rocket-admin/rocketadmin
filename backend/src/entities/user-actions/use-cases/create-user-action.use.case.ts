import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreateUserActionDs } from '../application/data-sctructures/create-user-action.ds.js';
import { CreatedUserActionDs } from '../application/data-sctructures/created-user-action.ds.js';
import { buildCreatedUserActionDs } from '../utils/build-created-user-action-ds.js';
import { ICreateUserAction } from './use-cases-interfaces.js';

@Injectable()
export class CreateUserActionUseCase
	extends AbstractUseCase<CreateUserActionDs, CreatedUserActionDs>
	implements ICreateUserAction
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(actionData: CreateUserActionDs): Promise<CreatedUserActionDs> {
		const { message, userId } = actionData;
		const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
		if (!foundUser) {
			throw new HttpException(
				{
					message: Messages.USER_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		// A user has at most one action row (UNIQUE userId). Upsert instead of read-then-insert so that
		// concurrent requests for the same user cannot both take the insert branch.
		const savedUserAction = await this._dbContext.userActionRepository.upsertUserAction(userId, message);
		return buildCreatedUserActionDs(savedUserAction);
	}
}
