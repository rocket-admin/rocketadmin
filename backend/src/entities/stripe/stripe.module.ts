import { BaseType, DynamicModuleEnum, UseCaseType } from '../../common/data-injection.tokens.js';
import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { StripeWebhookController } from './stripe.controller.js';
import { StripeWebhookUseCase } from './use-cases/stripe-webhook.use.case.js';

@Global()
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
    {
      provide: DynamicModuleEnum.STRIPE_SERVICE,
      useFactory: async () => {
        try {
          const stripeService = (
            await import('@rocketadmin/private-modules/dist/src/private-stripe-module/private-stripe.service.js')
          ).PrivateStripeService;
          return new stripeService();
        } catch (error) {
          throw error;
        }
      },
    },
  ],
  exports: [DynamicModuleEnum.STRIPE_SERVICE],
})
export class StripeModule implements NestModule {
  // eslint-disable-next-line
  public configure(consumer: MiddlewareConsumer): any {}
}
