import { BaseType, DynamicModuleEnum, UseCaseType } from '../../common/data-injection.tokens.js';
import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GlobalDatabaseContext } from '../../common/application/global-database-context.js';
import { StripeWebhookController } from './stripe.controller.js';
import { StripeWebhookUseCase } from './use-cases/stripe-webhook.use.case.js';
import { isSaaS } from '../../helpers/app/is-saas.js';

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
          console.info(`Loading private stripe service...`);
          if (!isSaaS() || process.env.NODE_ENV === 'test') {
            throw new Error(
              `Loading private stripe service in non SaaS mode probably is an error. Private stripe service should be loaded only in SaaS mode.`,
            );
          }
          const stripeService =
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (await import('@rocketadmin/private-modules/dist/src/private-stripe-module/private-stripe.service.js'))
              .PrivateStripeService;
          return new stripeService();
        } catch (error) {
          console.error(`Error loading private stripe service: ${error.message}`);
          console.info(`Loading public stripe service...`);
          if (isSaaS() && process.env.NODE_ENV !== 'test') {
            console.warn(
              `Loading public stripe service in SaaS mode probably is an error. Public stripe service should be loaded only in non - SaaS mode.`,
            );
          }
          const publicStripeService = (await import('./public-stripe-service.js')).PublicStripeService;
          return new publicStripeService();
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
