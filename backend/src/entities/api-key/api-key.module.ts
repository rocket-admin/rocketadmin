import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

@Module({
  imports: [],
  providers: [],
  controllers: [],
})
export class ApiKeyModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply().forRoutes();
  }
}
