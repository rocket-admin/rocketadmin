import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GlobalDatabaseContext } from '../../common/application/global-database-context';
import { BaseType, UseCaseType } from '../../common/data-injection.tokens';
import { StripeWebhookController } from './stripe.controller';
import { StripeWebhookUseCase } from './use-cases/stripe-webhook.use.case';

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
