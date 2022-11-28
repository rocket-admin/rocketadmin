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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UseCaseType } from '../../common/data-injection.tokens';
import { MasterPassword, SlugUuid, UserId } from '../../decorators';
import { InTransactionEnum } from '../../enums';
import { Messages } from '../../exceptions/text/messages';
import { GroupEditGuard } from '../../guards';
import { SentryInterceptor } from '../../interceptors';
import { CreatePermissionsDs } from './application/data-structures/create-permissions.ds';
import { CreatePermissionsDto } from './dto';
import { IComplexPermission } from './permission.interface';
import { ICreateOrUpdatePermissions } from './use-cases/permissions-use-cases.interface';

@ApiBearerAuth()
@ApiTags('permissions')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
export class PermissionController {
  constructor(
    @Inject(UseCaseType.CREATE_OR_UPDATE_PERMISSIONS)
    private readonly createOrUpdatePermissionsUseCase: ICreateOrUpdatePermissions,
  ) {}

  @ApiOperation({ summary: 'Create  new permission or update existing' })
  @ApiResponse({
    status: 200,
    description: 'Permission successfully created/updated.',
  })
  @ApiBody({ type: CreatePermissionsDto })
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
