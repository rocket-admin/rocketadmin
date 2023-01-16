import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configService } from '../config/config.service.js';
import { databaseProviders } from './database.providers.js';

@Global()
@Module({
  imports: [TypeOrmModule.forRoot(configService.getTypeOrmConfig())],
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
