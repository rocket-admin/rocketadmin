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
import validator from 'validator';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { BodyEmail, BodyUuid, SlugUuid, UserId, VerificationString } from '../../decorators/index.js';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { GroupEditGuard, GroupReadGuard } from '../../guards/index.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { Constants } from '../../helpers/constants/constants.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { AmplitudeService } from '../amplitude/amplitude.service.js';
import { FoundUserInGroupDs } from '../user/application/data-structures/found-user-in-group.ds.js';
import { IToken, ITokenExp } from '../user/utils/generate-gwt-token.js';
import { AddUserInGroupDs } from './application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from './application/data-sctructures/added-user-in-group.ds.js';
import { DeletedGroupResultDs } from './application/data-sctructures/deleted-group-result.ds.js';
import { FoundUserGroupsDs } from './application/data-sctructures/found-user-groups.ds.js';
import { RemoveUserFromGroupResultDs } from './application/data-sctructures/remove-user-from-group-result.ds.js';
import { VerifyAddUserInGroupDs } from './application/data-sctructures/verify-add-user-in-group.ds.js';
import {
  IAddUserInGroup,
  IDeleteGroup,
  IFindAllUsersInGroup,
  IFindUserGroups,
  IRemoveUserFromGroup,
  IVerifyAddUserInGroup,
} from './use-cases/use-cases.interfaces.js';

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

  @Put('/group/user/verify/:slug')
  async verifyUserInvitation(
    @Body('password') password: string,
    @Res({ passthrough: true }) response: Response,
    @VerificationString() verificationString: string,
    @Body('name') name: string,
    @Req() req: Request,
  ): Promise<ITokenExp> {
    if (!password) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
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
    response.cookie(Constants.JWT_COOKIE_KEY_NAME, token.token);
    return {
      expires: token.exp,
      isTemporary: token.isTemporary,
    };
  }

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
