import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePermissionsDto } from './dto';
import { getCognitoUserName, getMasterPwd } from '../../helpers';
import { IComplexPermission } from './permission.interface';
import { IRequestWithCognitoInfo } from '../../authorization';
import { Messages } from '../../exceptions/text/messages';
import { SentryInterceptor } from '../../interceptors';
import { GroupEditGuard } from '../../guards';
import { UseCaseType } from '../../common/data-injection.tokens';
import { ICreateOrUpdatePermissions } from './use-cases/permissions-use-cases.interface';
import { CreatePermissionsDs } from './application/data-structures/create-permissions.ds';

@ApiBearerAuth()
@ApiTags('permissions')
@UseInterceptors(SentryInterceptor)
@Controller()
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
    @Param() params,
    @Req() request: IRequestWithCognitoInfo,
  ): Promise<IComplexPermission> {
    const groupId = params.slug;
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
    const cognitoUserName = getCognitoUserName(request);
    const masterPwd = getMasterPwd(request);
    const inputData: CreatePermissionsDs = {
      groupId: groupId,
      masterPwd: masterPwd,
      userId: cognitoUserName,
      permissions: permissions,
    };
    return await this.createOrUpdatePermissionsUseCase.execute(inputData);
  }
}
