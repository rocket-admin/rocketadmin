import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { CreateUserActionDs } from '../application/data-sctructures/create-user-action.ds.js';
import { CreatedUserActionDs } from '../application/data-sctructures/created-user-action.ds.js';
import { buildCreatedUserActionDs } from '../utils/build-created-user-action-ds.js';
import { buildNewUserActionEntity } from '../utils/build-new-user-action-entity.js';
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
    const foundUser = await this._dbContext.userRepository.findOneUserWithUserAction(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const userAction = foundUser.user_action;
    if (userAction) {
      userAction.message = message;
      const updatedAction = await this._dbContext.userActionRepository.saveNewOrUpdatedUserAction(userAction);
      return buildCreatedUserActionDs(updatedAction);
    }
    const newUserAction = buildNewUserActionEntity(actionData, foundUser);
    const savedUserAction = await this._dbContext.userActionRepository.saveNewOrUpdatedUserAction(newUserAction);
    return buildCreatedUserActionDs(savedUserAction);
  }
}
