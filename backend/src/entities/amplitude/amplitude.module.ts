import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity.js';
import { AmplitudeService } from './amplitude.service.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [AmplitudeService],
  exports: [AmplitudeService],
})
export class AmplitudeModule {}
