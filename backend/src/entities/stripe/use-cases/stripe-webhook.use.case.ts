import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface.js';
import { BaseType, DynamicModuleEnum } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { StripeWebhookDS } from '../application/data-structures/stripe-webhook.ds.js';
import { IStripeSerice } from '../application/interfaces/stripe-service.interface.js';
import { IStripeWebhook } from './stripe-use-cases.interface.js';

@Injectable()
export class StripeWebhookUseCase extends AbstractUseCase<StripeWebhookDS, void> implements IStripeWebhook {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    @Inject(DynamicModuleEnum.STRIPE_SERVICE)
    private readonly stripeService: IStripeSerice,
  ) {
    super();
  }

  protected async implementation(inputData: StripeWebhookDS): Promise<void> {
    const provessWebHookResult = this.stripeService.processStripeWebhook(inputData);
    if (!provessWebHookResult) {
      return;
    }
    const { stripeCustomerId, userId } = provessWebHookResult;
    if (stripeCustomerId && userId) {
      await this.setStripeCustomerIdToUser(userId, stripeCustomerId);
    }
  }

  private async setStripeCustomerIdToUser(userId: string, stripeCustomerId: string): Promise<void> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    foundUser.stripeId = stripeCustomerId;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    return;
  }
}
