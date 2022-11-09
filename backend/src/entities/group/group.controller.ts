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
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import validator from 'validator';
import { UseCaseType } from '../../common/data-injection.tokens';
import { BodyEmail, BodyUuid, SlugUuid, UserId, VerificationString } from '../../decorators';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums';
import { Messages } from '../../exceptions/text/messages';
import { GroupEditGuard, GroupReadGuard } from '../../guards';
import { Cacher } from '../../helpers/cache/cacher';
import { Constants } from '../../helpers/constants/constants';
import { SentryInterceptor } from '../../interceptors';
import { AmplitudeService } from '../amplitude/amplitude.service';
import { FoundUserInGroupDs } from '../user/application/data-structures/found-user-in-group.ds';
import { IToken, ITokenExp } from '../user/utils/generate-gwt-token';
import { AddUserInGroupDs } from './application/data-sctructures/add-user-in-group.ds';
import { AddedUserInGroupDs } from './application/data-sctructures/added-user-in-group.ds';
import { DeletedGroupResultDs } from './application/data-sctructures/deleted-group-result.ds';
import { FoundUserGroupsDs } from './application/data-sctructures/found-user-groups.ds';
import { RemoveUserFromGroupResultDs } from './application/data-sctructures/remove-user-from-group-result.ds';
import { VerifyAddUserInGroupDs } from './application/data-sctructures/verify-add-user-in-group.ds';
import { AddUserIngroupDto } from './dto/add-user-ingroup-dto';
import {
  IAddUserInGroup,
  IDeleteGroup,
  IFindAllUsersInGroup,
  IFindUserGroups,
  IRemoveUserFromGroup,
  IVerifyAddUserInGroup,
} from './use-cases/use-cases.interfaces';

@ApiBearerAuth()
@ApiTags('groups')
@UseInterceptors(SentryInterceptor)
@Controller()
@Injectable()
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
  async findAll(@UserId() userId: string): Promise<FoundUserGroupsDs> {
    try {
      return await this.findAllUserGroupsUseCase.execute(userId, InTransactionEnum.OFF);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupListReceived, userId);
    }
  }

  @ApiOperation({ summary: 'Get all users for current group' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
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

  @ApiOperation({ summary: 'Add an existing user in group by user email' })
  @ApiBody({ type: AddUserIngroupDto })
  @UseGuards(GroupEditGuard)
  @Put('/group/user')
  async addUserInGroup(
    @BodyEmail() email: string,
    @BodyUuid('groupId') groupId: string,
    @UserId() userId: string,
  ): Promise<AddedUserInGroupDs> {
    if (!email || email.length <= 0) {
      throw new HttpException(
        {
          message: Messages.USER_EMAIL_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

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
    try {
      return await this.addUserInGroupUseCase.execute({ email, groupId }, InTransactionEnum.ON);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserAdded, groupId);
    }
  }

  @ApiOperation({ summary: 'Add an existing user in group by user email' })
  @ApiBody({ type: VerifyAddUserInGroupDs })
  @Put('/group/user/verify/:slug')
  async verifyUserInvitation(
    @Body('password') password: string,
    @Res({ passthrough: true }) response: Response,
    @VerificationString() verificationString: string,
    @Body('name') name: string,
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
      verificationString: verificationString,
      user_password: password,
      user_name: name,
    };
    const token: IToken = await this.verifyAddUserInGroupUseCase.execute(inputData, InTransactionEnum.ON);
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
  async delete(@SlugUuid() groupId: string, @UserId() userId: string): Promise<DeletedGroupResultDs> {
    try {
      return this.deleteGroupUseCase.execute(groupId, InTransactionEnum.ON);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupDeleted, userId);
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
    @BodyEmail() email: string,
    @BodyUuid('groupId') groupId: string,
    @UserId() userId: string,
  ): Promise<RemoveUserFromGroupResultDs> {
    if (!email || email.length <= 0 || !validator.isEmail(email)) {
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
      return await this.removeUserFromGroupUseCase.execute(inputData, InTransactionEnum.ON);
    } catch (e) {
      throw e;
    } finally {
      await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.groupUserRemoved, userId);
    }
  }
}
