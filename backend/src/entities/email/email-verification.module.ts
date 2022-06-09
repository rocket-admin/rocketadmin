import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationEntity } from './email-verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailVerificationEntity])],
  providers: [],
  controllers: [],
})
export class EmailVerificationModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply().forRoutes();
  }
}
