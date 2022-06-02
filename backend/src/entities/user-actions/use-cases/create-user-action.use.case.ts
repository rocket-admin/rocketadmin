import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { CreateUserActionDs } from '../application/data-sctructures/create-user-action.ds';
import { ICreateUserAction } from './use-cases-interfaces';
import { CreatedUserActionDs } from '../application/data-sctructures/created-user-action.ds';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';
import { buildCreatedUserActionDs } from '../utils/build-created-user-action-ds';
import { buildNewUserActionEntity } from '../utils/build-new-user-action-entity';

@Injectable({ scope: Scope.REQUEST })
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
