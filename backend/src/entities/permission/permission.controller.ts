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
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { MasterPassword, SlugUuid, UserId } from '../../decorators/index.js';
import { InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { ConnectionEditGuard } from '../../guards/index.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { ComplexPermissionDs, CreatePermissionsDs } from './application/data-structures/create-permissions.ds.js';
import { ICreateOrUpdatePermissions } from './use-cases/permissions-use-cases.interface.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('Permissions')
@Injectable()
export class PermissionController {
  constructor(
    @Inject(UseCaseType.CREATE_OR_UPDATE_PERMISSIONS)
    private readonly createOrUpdatePermissionsUseCase: ICreateOrUpdatePermissions,
  ) {}

  @ApiOperation({ summary: 'Create or update permissions in group' })
  @ApiBody({ type: ComplexPermissionDs })
  @ApiResponse({
    status: 200,
    description: 'Create or update permissions in group.',
    type: ComplexPermissionDs,
  })
  @UseGuards(ConnectionEditGuard)
  @Put('permissions/:slug')
  async createOrUpdatePermissions(
    @Body('permissions') permissions: ComplexPermissionDs,
    @SlugUuid() groupId: string,
    @UserId() userId: string,
    @MasterPassword() masterPwd: string,
  ): Promise<ComplexPermissionDs> {
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
