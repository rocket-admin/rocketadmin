import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType, DynamicModuleEnum } from '../../../common/data-injection.tokens.js';
import { IStripeService } from '../../stripe/application/interfaces/stripe-service.interface.js';
import { AddStripeSetupIntentDs } from '../application/data-structures/add-stripe-setup-intent.ds.js';
import { AddedStripeSetupIntentDs } from '../application/data-structures/added-stripe-setup-intent.ds.js';
import { IAddStripeSetupIntent } from './user-use-cases.interfaces.js';
import { Messages } from '../../../exceptions/text/messages.js';

export class AddSetupIntentToCustomerUseCase
  extends AbstractUseCase<AddStripeSetupIntentDs, AddedStripeSetupIntentDs>
  implements IAddStripeSetupIntent
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    @Inject(DynamicModuleEnum.STRIPE_SERVICE)
    private readonly stripeService: IStripeService,
  ) {
    super();
  }

  protected async implementation(inputData: AddStripeSetupIntentDs): Promise<AddedStripeSetupIntentDs> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(inputData.userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.stripeService.attachStripeSetupIntentToCustomer(
      foundUser.stripeId,
      inputData.defaultPaymentMethodId,
      inputData.subscriptionLevel,
    );
    if (result) {
      return {
        success: true,
      };
    }
    throw new HttpException(
      {
        message: Messages.FAILED_TO_ADD_SETUP_INTENT_AND_SUBSCRIPTION,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
