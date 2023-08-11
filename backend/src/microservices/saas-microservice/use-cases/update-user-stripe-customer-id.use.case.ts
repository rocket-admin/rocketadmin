import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { UpdateUserStripeCustomerDS } from '../data-structures/update-user-stripe-customer-id.ds.js';
import { IUpdateUserStripeCustomerId } from './saas-use-cases.interface.js';
import { Messages } from '../../../exceptions/text/messages.js';

export class UpdateUserStripeCustomerIdUseCase
  extends AbstractUseCase<UpdateUserStripeCustomerDS, void>
  implements IUpdateUserStripeCustomerId
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateUserStripeCustomerDS): Promise<void> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(inputData.userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    foundUser.stripeId = inputData.stripeCustomerId;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    return;
  }
}
