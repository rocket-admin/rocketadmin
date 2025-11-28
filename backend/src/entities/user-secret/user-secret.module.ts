import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSecretEntity } from './user-secret.entity.js';
import { SecretAccessLogEntity } from '../secret-access-log/secret-access-log.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { UserSecretController } from './user-secret.controller.js';
import { UserSecretsService } from './user-secrets.service.js';
import { AuthMiddleware } from '../../authorization/auth.middleware.js';
import { LogOutEntity } from '../log-out/log-out.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserSecretEntity, SecretAccessLogEntity, UserEntity, LogOutEntity])],
  providers: [UserSecretsService],
  controllers: [UserSecretController],
  exports: [UserSecretsService],
})
export class UserSecretModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: '/secrets',
        method: RequestMethod.POST,
      },
      {
        path: '/secrets',
        method: RequestMethod.GET,
      },
      {
        path: '/secrets/:slug',
        method: RequestMethod.GET,
      },
      {
        path: '/secrets/:slug',
        method: RequestMethod.PUT,
      },
      {
        path: '/secrets/:slug',
        method: RequestMethod.DELETE,
      },
      {
        path: '/secrets/:slug/audit-log',
        method: RequestMethod.GET,
      },
    );
  }
}
