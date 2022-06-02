import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../user/user.entity';
import { AmplitudeService } from './amplitude.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [AmplitudeService],
  exports: [AmplitudeService],
})
export class AmplitudeModule {}
