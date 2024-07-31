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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { SlugUuid, UserId } from '../../decorators/index.js';
import { AmplitudeEventTypeEnum, InTransactionEnum } from '../../enums/index.js';
import { Messages } from '../../exceptions/text/messages.js';
import { GroupEditGuard, GroupReadGuard } from '../../guards/index.js';
import { Cacher } from '../../helpers/cache/cacher.js';
import { SentryInterceptor } from '../../interceptors/index.js';
import { AmplitudeService } from '../amplitude/amplitude.service.js';
import { FoundUserInGroupDs } from '../user/application/data-structures/found-user-in-group.ds.js';
import { AddUserInGroupDs, AddUserInGroupWithSaaSDs } from './application/data-sctructures/add-user-in-group.ds.js';
import { AddedUserInGroupDs } from './application/data-sctructures/added-user-in-group.ds.js';
import { DeletedGroupResultDs } from './application/data-sctructures/deleted-group-result.ds.js';
import { FoundGroupDataInfoDs, FoundUserGroupsDs } from './application/data-sctructures/found-user-groups.ds.js';
import { RemoveUserFromGroupResultDs } from './application/data-sctructures/remove-user-from-group-result.ds.js';
import {
  IAddUserInGroup,
  IDeleteGroup,
  IFindAllUsersInGroup,
  IFindUserGroups,
  IRemoveUserFromGroup,
  IUpdateGroupTitle,
} from './use-cases/use-cases.interfaces.js';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddUserInGroupDto } from './dto/add-user-ingroup-dto.js';
import { DeleteUserFromGroupDTO } from './dto/delete-user-from-group-dto.js';
import { UpdateGroupTitleDto } from './dto/update-group-title.dto.js';

@UseInterceptors(SentryInterceptor)
@Controller()
@ApiBearerAuth()
@ApiTags('groups')
@Injectable()
export class GroupController {
  constructor(
    @Inject(UseCaseType.INVITE_USER_IN_GROUP)
    private readonly addUserInGroupUseCase: IAddUserInGroup,
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
  @Get('group/users/:groupId')
  async findAllUsersInGroup(
    @UserId() userId: string,
    @SlugUuid('groupId') groupId: string,
  ): Promise<Array<FoundUserInGroupDs>> {
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

  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({
    status: 200,
    description: 'Delete group.',
    type: DeletedGroupResultDs,
  })
  @UseGuards(GroupEditGuard)
  @Delete('/group/:groupId')
  async delete(@SlugUuid('groupId') groupId: string, @UserId() userId: string): Promise<DeletedGroupResultDs> {
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
