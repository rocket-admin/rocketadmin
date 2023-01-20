import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens.js';
import { StripeWebhookController } from './stripe.controller.js';
import { StripeWebhookUseCase } from './use-cases/stripe-webhook.use.case.js';

@Module({
  imports: [],
  controllers: [StripeWebhookController],
  providers: [
    {
      provide: BaseType.GLOBAL_DB_CONTEXT,
      useClass: GlobalDatabaseContext,
    },
    {
      provide: UseCaseType.STRIPE_WEBHOOK,
      useClass: StripeWebhookUseCase,
    },
  ],
})
export class StripeModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {}
}
