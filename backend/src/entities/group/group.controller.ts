import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid, UserId, VerificationString } from '../../decorators/index.js';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { GroupEditGuard, GroupReadGuard } from '../../guards/index.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { Constants } from '../../helpers/constants/constants.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { AmplitudeService } from '../amplitude/amplitude.service.js';
import { FoundUserInGroupDs } from '../user/application/data-structures/found-user-in-group.ds.js';
import { IToken, ITokenExp } from '../user/utils/generate-gwt-token.js';
import { AddUserInGroupDs, AddUserInGroupWithSaaSDs } from './application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from './application/data-sctructures/added-user-in-group.ds.js';
import { DeletedGroupResultDs } from './application/data-sctructures/deleted-group-result.ds.js';
import { FoundGroupDataInfoDs, FoundUserGroupsDs } from './application/data-sctructures/found-user-groups.ds.js';
import { RemoveUserFromGroupResultDs } from './application/data-sctructures/remove-user-from-group-result.ds.js';
import { VerifyAddUserInGroupDs } from './application/data-sctructures/verify-add-user-in-group.ds.js';
import {
  IDeleteGroup,
  IFindAllUsersInGroup,
  IFindUserGroups,
  IRemoveUserFromGroup,
  ISaaSAddUserInGroup,
  IUpdateGroupTitle,
  IVerifyAddUserInGroup,
} from './use-cases/use-cases.interfaces.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddUserInGroupDto } from './dto/add-user-ingroup-dto.js';
import { TokenExpirationResponseDto } from '../company-info/application/dto/token-expiration-response.dto.js';
import { DeleteUserFromGroupDTO } from './dto/delete-user-from-group-dto.js';
import { VerifyUserInGroupInvitationDto } from './dto/verify-user-in-group-invitation-request-body.dto.js';
import { getCookieDomainOptions } from '../user/utils/get-cookie-domain-options.js';
import { UpdateGroupTitleDto } from './dto/update-group-title.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('groups')
@Injectable()
export class GroupController {
  constructor(
    @Inject(UseCaseType.INVITE_USER_IN_GROUP)
    private readonly addUserInGroupUseCase: ISaaSAddUserInGroup,
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
    @Inject(UseCaseType.UPDATE_GROUP_TITLE)
    private readonly updateGroupTitleUseCase: IUpdateGroupTitle,
    private readonly amplitudeService: AmplitudeService,
  ) {}

  @ApiOperation({ summary: 'Get all user groups' })
  @ApiResponse({
    status: 200,
    description: 'Get all user groups.',
    type: FoundUserGroupsDs,
  })
  @Get('groups')
  async findAll(@UserId() userId: string): Promise<FoundUserGroupsDs> {
    try {
      return await this.findAllUserGroupsUseCase.execute(userId, InTransactionEnum.OFF);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupListReceived, userId);
    }
  }

  @ApiOperation({ summary: 'Get all users in group' })
  @ApiResponse({
    status: 200,
    description: 'Get all users in group.',
    type: Array<FoundUserInGroupDs>,
  })
  @UseGuards(GroupReadGuard)
  @Get('group/users/:slug')
  async findAllUsersInGroup(@UserId() userId: string, @SlugUuid() groupId: string): Promise<Array<FoundUserInGroupDs>> {
    try {
      return this.findAllUsersInGroupUseCase.execute(groupId, InTransactionEnum.OFF);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserListReceived, userId);
    }
  }

  @ApiOperation({ summary: 'Add user in company and group in company' })
  @ApiBody({ type: AddUserInGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Add user in company and group in company.',
    type: AddedUserInGroupDs,
  })
  @UseGuards(GroupEditGuard)
  @Put('/group/user')
  async addUserInGroup(@Body() userData: AddUserInGroupDto, @UserId() userId: string): Promise<AddedUserInGroupDs> {
    const { email, groupId, companyId, role } = userData;
    if (!Cacher.canInvite(userId, groupId)) {
      throw new HttpException(
        {
          message: Messages.MAXIMUM_INVITATIONS_COUNT_REACHED,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    Cacher.increaseUserInvitationsCacheCount(userId);
    Cacher.increaseGroupInvitationsCacheCount(groupId);
    const inputData: AddUserInGroupWithSaaSDs = {
      companyId: companyId,
      email: email,
      groupId: groupId,
      userSaasRole: role,
      inviterId: userId,
    };
    try {
      return await this.addUserInGroupUseCase.execute(inputData, InTransactionEnum.ON);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserAdded, groupId);
    }
  }

  @ApiOperation({ summary: 'Verify user in group invitation' })
  @ApiBody({ type: VerifyUserInGroupInvitationDto })
  @ApiResponse({
    status: 200,
    description: 'Verify user in group invitation.',
    type: TokenExpirationResponseDto,
  })
  @Put('/group/user/verify/:slug')
  async verifyUserInvitation(
    @Body() verificationData: VerifyUserInGroupInvitationDto,
    @Res({ passthrough: true }) response: Response,
    @VerificationString() verificationString: string,
    @Req() req: Request,
  ): Promise<ITokenExp> {
    const { password, name } = verificationData;
    try {
      const tokenInReq = req.cookies[Constants.JWT_COOKIE_KEY_NAME];
      if (tokenInReq) {
        response.clearCookie(Constants.JWT_COOKIE_KEY_NAME);
      }
      throw new HttpException(
        {
          message: Messages.TRY_VERIFY_ADD_USER_WHEN_LOGGED_IN,
        },
        HttpStatus.BAD_REQUEST,
      );
    } catch (e) {}

    const inputData: VerifyAddUserInGroupDs = {
      verificationString: verificationString,
      user_password: password,
      user_name: name,
    };
    const token: IToken = await this.verifyAddUserInGroupUseCase.execute(inputData, InTransactionEnum.ON);
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, token.token, {
      httpOnly: true,
      secure: true,
      expires: token.exp,
      ...getCookieDomainOptions(),
    });
    response.cookie(Constants.ROCKETADMIN_AUTHENTICATED_COOKIE, 1, {
      httpOnly: false,
      ...getCookieDomainOptions(),
    });
    return {
      expires: token.exp,
      isTemporary: token.isTemporary,
    };
  }

  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({
    status: 200,
    description: 'Delete group.',
    type: DeletedGroupResultDs,
  })
  @UseGuards(GroupEditGuard)
  @Delete('/group/:slug')
  async delete(@SlugUuid() groupId: string, @UserId() userId: string): Promise<DeletedGroupResultDs> {
    try {
      return this.deleteGroupUseCase.execute(groupId, InTransactionEnum.ON);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupDeleted, userId);
    }
  }

  @ApiOperation({ summary: 'Delete user from group' })
  @ApiBody({ type: DeleteUserFromGroupDTO })
  @ApiResponse({
    status: 200,
    description: 'Delete user from group.',
    type: RemoveUserFromGroupResultDs,
  })
  @UseGuards(GroupEditGuard)
  @Put('/group/user/delete')
  async removeUserFromGroup(
    @Body() userToExcludeData: DeleteUserFromGroupDTO,
    @UserId() userId: string,
  ): Promise<RemoveUserFromGroupResultDs> {
    const { email, groupId } = userToExcludeData;
    const inputData: AddUserInGroupDs = {
      email: email,
      groupId: groupId,
    };
    try {
      return await this.removeUserFromGroupUseCase.execute(inputData, InTransactionEnum.ON);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserRemoved, userId);
    }
  }

  @ApiOperation({ summary: 'Update group title' })
  @ApiBody({ type: UpdateGroupTitleDto })
  @ApiResponse({
    status: 200,
    description: 'Update group title.',
    type: FoundGroupDataInfoDs,
  })
  @UseGuards(GroupEditGuard)
  @Put('/group/title/')
  async updateGroupTitle(@Body() groupData: UpdateGroupTitleDto): Promise<FoundGroupDataInfoDs> {
    return await this.updateGroupTitleUseCase.execute(groupData, InTransactionEnum.OFF);
  }
}
