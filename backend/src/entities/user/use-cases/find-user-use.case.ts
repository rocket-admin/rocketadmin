import AbstractUseCase from '../../../common/abstract-use.case';
import { IFindUserUseCase } from './user-use-cases.interfaces';
import { FindUserDs } from '../application/data-structures/find-user.ds';
import { CreateUserDs } from '../application/data-structures/create-user.ds';
import { FoundUserDs } from '../application/data-structures/found-user.ds';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { AmplitudeEventTypeEnum } from '../../../enums';
import { BaseType } from '../../../common/data-injection.tokens';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions';
import { buildTestTableSettings } from '../utils/build-test-table-settings';
import { ConnectionEntity } from '../../connection/connection.entity';
import { Constants } from '../../../helpers/constants/constants';
import { GroupEntity } from '../../group/group.entity';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { PermissionEntity } from '../../permission/permission.entity';
import { StripeUtil } from '../utils/stripe-util';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { UserEntity } from '../user.entity';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import { getCurrentUserSubscription } from '../../../helpers/stripe/get-current-user-subscription';

@Injectable({ scope: Scope.REQUEST })
export class FindUserUseCase
  extends AbstractUseCase<FindUserDs | CreateUserDs, FoundUserDs>
  implements IFindUserUseCase
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(userData: FindUserDs | CreateUserDs): Promise<FoundUserDs> {
    const user = await this._dbContext.userRepository.findOneUserById(userData.id);
    if (user) {
      return await FindUserUseCase.buildFoundUserDs(user);
    }

    const savedUser = await this._dbContext.userRepository.createUser(userData);
    const testConnections = Constants.getTestConnectionsArr();
    const testConnectionsEntities = buildConnectionEntitiesFromTestDtos(testConnections);
    const createdTestConnections = await Promise.all(
      testConnectionsEntities.map(async (connection): Promise<ConnectionEntity> => {
        connection.author = savedUser;
        return await this._dbContext.connectionRepository.saveNewConnection(connection);
      }),
    );
    const testGroupsEntities = buildDefaultAdminGroups(savedUser, createdTestConnections);
    const createdTestGroups = await Promise.all(
      testGroupsEntities.map(async (group: GroupEntity) => {
        return await this._dbContext.groupRepository.saveNewOrUpdatedGroup(group);
      }),
    );
    const testPermissionsEntities = buildDefaultAdminPermissions(createdTestGroups);
    await Promise.all(
      testPermissionsEntities.map(async (permission: PermissionEntity) => {
        await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(permission);
      }),
    );
    const testTableSettingsArrays: Array<Array<TableSettingsEntity>> = buildTestTableSettings(createdTestConnections);
    await Promise.all(
      testTableSettingsArrays.map(async (array: Array<TableSettingsEntity>) => {
        await Promise.all(
          array.map(async (tableSettings: TableSettingsEntity) => {
            await this._dbContext.tableSettingsRepository.saveNewOrUpdatedSettings(tableSettings);
          }),
        );
      }),
    );
    await this.amplitudeService.formAndSendLogRecord(AmplitudeEventTypeEnum.userRegistered, savedUser.id);
    return await FindUserUseCase.buildFoundUserDs(savedUser);
  }

  private static async buildFoundUserDs(user: UserEntity): Promise<FoundUserDs> {
    const portalLink = await StripeUtil.createPortalLink(user);
    const userSubscriptionLevel = await getCurrentUserSubscription(user.stripeId);
    return {
      id: user.id,
      createdAt: user.createdAt,
      isActive: user.isActive,
      email: user.email,
      portal_link: portalLink,
      subscriptionLevel: userSubscriptionLevel,
    };
  }
}
