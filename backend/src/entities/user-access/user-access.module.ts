import { ConnectionEntity } from '../connection/connection.entity';
import { Global, Module } from '@nestjs/common';
import { PermissionEntity } from '../permission/permission.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAccessService } from './user-access.service';
import { UserEntity } from '../user/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ConnectionEntity, PermissionEntity, UserEntity])],
  providers: [UserAccessService],
  exports: [UserAccessService],
})
export class UserAccessModule {}
