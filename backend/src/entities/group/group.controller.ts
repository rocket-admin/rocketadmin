import { AddUserIngroupDto } from './dto/add-user-ingroup-dto';
import { AmplitudeEventTypeEnum } from '../../enums';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { getCognitoUserName } from '../../helpers';
import { IRequestWithCognitoInfo } from '../../authorization';
import { Messages } from '../../exceptions/text/messages';
import { SentryInterceptor } from '../../interceptors';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GroupEditGuard, GroupReadGuard } from '../../guards';
import { UseCaseType } from '../../common/data-injection.tokens';
import {
  IAddUserInGroup,
  IDeleteGroup,
  IFindAllUsersInGroup,
  IFindUserGroups,
  IRemoveUserFromGroup,
  IVerifyAddUserInGroup,
} from './use-cases/use-cases.interfaces';
import { VerifyAddUserInGroupDs } from './application/data-sctructures/verify-add-user-in-group.ds';
import { AmplitudeService } from '../amplitude/amplitude.service';
import { Cacher } from '../../helpers/cache/cacher';
import { AddedUserInGroupDs } from './application/data-sctructures/added-user-in-group.ds';
import { FoundUserGroupsDs } from './application/data-sctructures/found-user-groups.ds';
import { IToken, ITokenExp } from '../user/utils/generate-gwt-token';
import { Response } from 'express';
import { Constants } from '../../helpers/constants/constants';
import { FoundUserInGroupDs } from '../user/application/data-structures/found-user-in-group.ds';
import { AddUserInGroupDs } from './application/data-sctructures/add-user-in-group.ds';
import { RemoveUserFromGroupResultDs } from './application/data-sctructures/remove-user-from-group-result.ds';
import { DeletedGroupResultDs } from './application/data-sctructures/deleted-group-result.ds';

@ApiBearerAuth()
@ApiTags('groups')
@UseInterceptors(SentryInterceptor)
@Controller()
export class GroupController {
  constructor(
    @Inject(UseCaseType.INVITE_USER_IN_GROUP)
    private readonly addUserInGroupUseCase: IAddUserInGroup,
    @Inject(UseCaseType.VERIFY_INVITE_USER_IN_GROUP)
    private readonly verifyAddUserInGroupUseCase: IVerifyAddUserInGroup,
    @Inject(UseCaseType.FIND_ALL_USER_GROUPS)
    private readonly findAllUserGroupsUseCase: IFindUserGroups,
    @Inject(UseCaseType.FIND_ALL_USERS_IN_GROUP)
    private readonly findAllUsersInGroupUseCase: IFindAllUsersInGroup,
    @Inject(UseCaseType.REMOVE_USER_FROM_GROUP)
    private readonly removeUserFromGroupUseCase: IRemoveUserFromGroup,
    @Inject(UseCaseType.DELETE_GROUP)
    private readonly deleteGroupUseCase: IDeleteGroup,
    private readonly amplitudeService: AmplitudeService,
  ) {}

  @ApiOperation({ summary: 'Get all groups for current user' })
  @ApiResponse({
    status: 200,
    description: 'Return all groups for current user.',
  })
  @Get('groups')
  async findAll(@Req() request: IRequestWithCognitoInfo): Promise<FoundUserGroupsDs> {
    const cognitoUserName = getCognitoUserName(request);
    try {
      return await this.findAllUserGroupsUseCase.execute(cognitoUserName);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupListReceived, cognitoUserName);
    }
  }

  @ApiOperation({ summary: 'Get all users for current group' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  @UseGuards(GroupReadGuard)
  @Get('group/users/:slug')
  async findAllUsersInGroup(
    @Param() params: any,
    @Req() request: IRequestWithCognitoInfo,
  ): Promise<Array<FoundUserInGroupDs>> {
    const cognitoUserName = getCognitoUserName(request);
    const id = params.slug;
    try {
      return this.findAllUsersInGroupUseCase.execute(id);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserListReceived, cognitoUserName);
    }
  }

  @ApiOperation({ summary: 'Add an existing user in group by user email' })
  @ApiBody({ type: AddUserIngroupDto })
  @UseGuards(GroupEditGuard)
  @Put('/group/user')
  async addUserInGroup(
    @Req() request: IRequestWithCognitoInfo,
    @Body('email') email: string,
    @Body('groupId') groupId: string,
  ): Promise<AddedUserInGroupDs> {
    const cognitoUserName = getCognitoUserName(request);
    if (!email || email.length <= 0) {
      throw new HttpException(
        {
          message: Messages.USER_EMAIL_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!Cacher.canInvite(cognitoUserName, groupId)) {
      throw new HttpException(
        {
          message: Messages.MAXIMUM_INVITATIONS_COUNT_REACHED,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    Cacher.increaseUserInvitationsCacheCount(cognitoUserName);
    Cacher.increaseGroupInvitationsCacheCount(groupId);
    try {
      return await this.addUserInGroupUseCase.execute({ email, groupId });
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserAdded, cognitoUserName);
    }
  }

  @ApiOperation({ summary: 'Add an existing user in group by user email' })
  @ApiBody({ type: VerifyAddUserInGroupDs })
  @Put('/group/user/verify/:slug')
  async verifyUserInvitation(
    @Param() params,
    @Res({ passthrough: true }) response: Response,
    @Body('password') password: string,
  ): Promise<ITokenExp> {
    if (!password) {
      throw new HttpException(
        {
          message: 'Password is missing',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: VerifyAddUserInGroupDs = {
      userPassword: password,
      verificationString: params.slug,
    };
    const token: IToken = await this.verifyAddUserInGroupUseCase.execute(inputData);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, token.token);
    return { expires: token.exp };
  }

  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({
    status: 201,
    description: 'The group has been successfully deleted.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(GroupEditGuard)
  @Delete('/group/:slug')
  async delete(@Param() params, @Req() request: IRequestWithCognitoInfo): Promise<DeletedGroupResultDs> {
    const cognitoUserName = getCognitoUserName(request);
    const groupId = params.slug;
    try {
      return this.deleteGroupUseCase.execute(groupId);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupDeleted, cognitoUserName);
    }
  }

  @ApiOperation({ summary: 'Remove user from group' })
  @ApiResponse({
    status: 201,
    description: 'User has been successfully deleted.',
  })
  @ApiBody({ type: AddUserIngroupDto })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @UseGuards(GroupEditGuard)
  @Put('/group/user/delete')
  async removeUserFromGroup(
    @Body('email') email: string,
    @Body('groupId') groupId: string,
    @Req() request: IRequestWithCognitoInfo,
  ): Promise<RemoveUserFromGroupResultDs> {
    const cognitoUserName = getCognitoUserName(request);
    if (!email || email.length <= 0) {
      throw new HttpException(
        {
          message: Messages.USER_EMAIL_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const inputData: AddUserInGroupDs = {
      email: email,
      groupId: groupId,
    };
    try {
      return await this.removeUserFromGroupUseCase.execute(inputData);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserRemoved, cognitoUserName);
    }
  }
}
