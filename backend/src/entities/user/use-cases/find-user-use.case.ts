import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { AmplitudeEventTypeEnum } from '../../../enums';
import { Constants } from '../../../helpers/constants/constants';
import { getCurrentUserSubscription } from '../../../helpers/stripe/get-current-user-subscription';
import { AmplitudeService } from '../../amplitude/amplitude.service';
import { ConnectionEntity } from '../../connection/connection.entity';
import { GroupEntity } from '../../group/group.entity';
import { PermissionEntity } from '../../permission/permission.entity';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { CreateUserDs } from '../application/data-structures/create-user.ds';
import { FindUserDs } from '../application/data-structures/find-user.ds';
import { FoundUserDs } from '../application/data-structures/found-user.ds';
import { UserEntity } from '../user.entity';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions';
import { buildTestTableSettings } from '../utils/build-test-table-settings';
import { getUserIntercomHash } from '../utils/get-user-intercom-hash';
import { StripeUtil } from '../utils/stripe-util';
import { IFindUserUseCase } from './user-use-cases.interfaces';

@Injectable()
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

    let savedUser = await this._dbContext.userRepository.createUser(userData);
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
    if (!savedUser.stripeId && process.env.NODE_ENV !== 'test') {
      savedUser.stripeId = await StripeUtil.createUserStripeCustomerAndReturnStripeId(savedUser.id);
      savedUser = await this._dbContext.userRepository.saveUserEntity(savedUser);
    }
    return await FindUserUseCase.buildFoundUserDs(savedUser);
  }

  private static async buildFoundUserDs(user: UserEntity): Promise<FoundUserDs> {
    const portalLink = await StripeUtil.createPortalLink(user);
    const userSubscriptionLevel = await getCurrentUserSubscription(user.stripeId);
    const intercomHash = getUserIntercomHash(user.id);
    return {
      id: user.id,
      createdAt: user.createdAt,
      isActive: user.isActive,
      email: user.email,
      portal_link: portalLink,
      subscriptionLevel: userSubscriptionLevel,
      intercom_hash: intercomHash,
      name: user.name,
    };
  }
}
