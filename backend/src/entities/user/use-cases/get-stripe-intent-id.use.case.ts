import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { StripeIntentDs } from '../application/data-structures/stripe-intent-id.ds.js';
import { IGetStripeIntentId } from './user-use-cases.interfaces.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType, DynamicModuleEnum } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { IStripeService } from '../../stripe/application/interfaces/stripe-service.interface.js';

@Injectable()
export class GetStripeIntentIdUseCase extends AbstractUseCase<string, StripeIntentDs> implements IGetStripeIntentId {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    @Inject(DynamicModuleEnum.STRIPE_SERVICE)
    private readonly stripeService: IStripeService,
  ) {
    super();
  }

  protected async implementation(userId: string): Promise<StripeIntentDs> {
    const user = await this._dbContext.userRepository.findOneUserById(userId);
    if (!user) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }
    if (!user.stripeId) {
      const createdCustomerId: string = await this.stripeService.createStripeCustomer(user.id, user.email);
      if (!createdCustomerId) {
        throw new HttpException(
          {
            message: Messages.FAILED_TO_CREATE_STRIPE_CUSTOMER,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      user.stripeId = createdCustomerId;
      await this._dbContext.userRepository.saveUserEntity(user);
    }

    const result = await this.stripeService.createStripeSetupIntent(user.stripeId);
    if (result) {
      return {
        stripeIntentId: result.id,
        stripeIntentSecret: result.client_secret,
      };
    }
    return {
      stripeIntentId: null,
      stripeIntentSecret: null,
    };
  }
}
