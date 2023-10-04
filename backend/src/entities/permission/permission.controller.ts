import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { GroupEditGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { CreatePermissionsDs } from './application/data-structures/create-permissions.ds.js';
import { IComplexPermission } from './permission.interface.js';
import { ICreateOrUpdatePermissions } from './use-cases/permissions-use-cases.interface.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('permissions')
@Injectable()
export class PermissionController {
  constructor(
    @Inject(UseCaseType.CREATE_OR_UPDATE_PERMISSIONS)
    private readonly createOrUpdatePermissionsUseCase: ICreateOrUpdatePermissions,
  ) {}

  @UseGuards(GroupEditGuard)
  @Put('permissions/:slug')
  async createOrUpdatePermissions(
    @Body('permissions') permissions: IComplexPermission,
    @SlugUuid() groupId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<IComplexPermission> {
    if (!groupId) {
      throw new HttpException(
        {
          message: Messages.ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!permissions) {
      throw new HttpException(
        {
          message: Messages.PERMISSIONS_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: CreatePermissionsDs = {
      groupId: groupId,
      masterPwd: masterPwd,
      userId: userId,
      permissions: permissions,
    };
    return await this.createOrUpdatePermissionsUseCase.execute(inputData, InTransactionEnum.ON);
  }
}
