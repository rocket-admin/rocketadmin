import AbstractUseCase from '../../../common/abstract-use.case';
import { BaseType } from '../../../common/data-injection.tokens';
import { CreatedUserDs } from '../application/data-structures/created-user.ds';
import { CreateUserDs } from '../application/data-structures/create-user.ds';
import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import { ICreateUserUseCase } from './user-use-cases.interfaces';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Messages } from '../../../exceptions/text/messages';
import { buildCreatedUserDs } from '../utils/build-created-user.ds';
import { Constants } from '../../../helpers/constants/constants';
import { buildConnectionEntitiesFromTestDtos } from '../utils/build-connection-entities-from-test-dtos';
import { GroupEntity } from 'src/entities/group/group.entity';
import { buildDefaultAdminGroups } from '../utils/build-default-admin-groups';
import { ConnectionEntity } from '../../connection/connection.entity';
import { buildDefaultAdminPermissions } from '../utils/build-default-admin-permissions';
import { PermissionEntity } from '../../permission/permission.entity';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';
import { buildTestTableSettings } from '../utils/build-test-table-settings';

@Injectable({ scope: Scope.REQUEST })
export class CreateUserUseCase extends AbstractUseCase<CreateUserDs, CreatedUserDs> implements ICreateUserUseCase {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(userData: CreateUserDs): Promise<CreatedUserDs | null> {
    if (!userData.id) {
      throw new HttpException(
        {
          message: Messages.USER_ID_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
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

    return buildCreatedUserDs(savedUser);
  }
}
