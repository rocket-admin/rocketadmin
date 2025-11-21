import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSecretEntity } from './user-secret.entity.js';
import { SecretAccessLogEntity } from '../secret-access-log/secret-access-log.entity.js';
import { UserEntity } from '../user/user.entity.js';
import { UserSecretController } from './user-secret.controller.js';
import { UserSecretsService } from './user-secrets.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserSecretEntity, SecretAccessLogEntity, UserEntity])],
  providers: [UserSecretsService],
  controllers: [UserSecretController],
  exports: [UserSecretsService],
})
export class UserSecretModule {}
