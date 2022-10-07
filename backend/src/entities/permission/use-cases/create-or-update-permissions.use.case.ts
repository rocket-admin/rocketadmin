import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { ICreateOrUpdatePermissions } from './permissions-use-cases.interface';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import {
  CreatePermissionsDs,
  PermissionsDs,
  TablePermissionDs,
} from '../application/data-structures/create-permissions.ds';
import { Messages } from '../../../exceptions/text/messages';
import { PermissionEntity } from '../permission.entity';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums';
import { buildNewPermissionEntityConnection } from '../utils/build-new-permission-entity-connection';
import { buildNewPermissionEntityGroup } from '../utils/build-new-permission-entity-group';
import { buildFinalTablesPermissions } from '../utils/build-final-tables-permissions';

@Injectable()
export class CreateOrUpdatePermissionsUseCase
  extends AbstractUseCase<CreatePermissionsDs, PermissionsDs>
  implements ICreateOrUpdatePermissions
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: CreatePermissionsDs): Promise<PermissionsDs> {
    const resultPermissions: PermissionsDs = {
      connection: {
        accessLevel: AccessLevelEnum.none,
        connectionId: inputData.permissions.connection.connectionId,
      },
      group: {
        accessLevel: AccessLevelEnum.none,
        groupId: inputData.permissions.group.groupId,
      },
      tables: [],
    };

    const {
      groupId,
      permissions: {
        connection: { connectionId },
      },
    } = inputData;
    const connectionWithThisGroup = await this._dbContext.connectionRepository.getConnectionByGroupId(groupId);
    if (connectionWithThisGroup.id !== connectionId) {
      throw new HttpException(
        {
          message: Messages.GROUP_NOT_FROM_THIS_CONNECTION,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const groupToUpdate = await this._dbContext.groupRepository.findGroupWithPermissionsById(groupId);
    if (!groupToUpdate) {
      throw new HttpException(
        {
          message: Messages.GROUP_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (groupToUpdate.isMain) {
      throw new HttpException(
        {
          message: Messages.CANNOT_CHANGE_ADMIN_GROUP,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const [currentConnectionPermission, currentGroupPermission]: Array<PermissionEntity> = await Promise.all([
      (async () => {
        return await this._dbContext.permissionRepository.getPermissionEntityForConnection(connectionId, groupId);
      })(),
      (async () => {
        return await this._dbContext.permissionRepository.getPermissionEntityForGroup(connectionId, groupId);
      })(),
    ]);
    const allTablePermissionsInGroup = await this._dbContext.permissionRepository.getGroupPermissionsForAllTables(
      connectionId,
      groupId,
    );
    // *** CONNECTION PERMISSION
    if (currentConnectionPermission) {
      const updatedPermissionData = {
        type: PermissionTypeEnum.Connection,
        accessLevel: inputData.permissions.connection.accessLevel,
        tableName: '',
        groupId: groupId,
      };
      const updated = Object.assign(currentConnectionPermission, updatedPermissionData);
      await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(updated);
      await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
      resultPermissions.connection.accessLevel = updated.accessLevel;
    } else {
      const newPermission = buildNewPermissionEntityConnection(inputData.permissions.connection.accessLevel);
      const savedPermission = await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(newPermission);
      groupToUpdate.permissions.push(savedPermission);
      await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
      resultPermissions.connection.accessLevel = newPermission.accessLevel as AccessLevelEnum;
    }

    // *** GROUP PERMISSION
    if (currentGroupPermission) {
      const updatedPermissionData = {
        type: PermissionTypeEnum.Group,
        accessLevel: inputData.permissions.group.accessLevel,
        tableName: '',
        groupId: groupId,
      };
      const updated = Object.assign(currentGroupPermission, updatedPermissionData);
      await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(updated);
      await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
      resultPermissions.group.accessLevel = updated.accessLevel;
    } else {
      const newPermission = buildNewPermissionEntityGroup(inputData.permissions.group.accessLevel);
      const savedPermission = await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(newPermission);
      groupToUpdate.permissions.push(savedPermission);
      await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
      resultPermissions.group.accessLevel = newPermission.accessLevel as AccessLevelEnum;
    }

    // *** TABLES PERMISSIONS
    const tablePermissions = inputData.permissions.tables;
    // delete falsy permissions
    const deletedPermissions: Array<PermissionEntity> = [];
    await Promise.all(
      tablePermissions.map(async (tablePermission: TablePermissionDs) => {
        const { accessLevel, tableName } = tablePermission;
        for (const key in accessLevel) {
          // has own property check added to avoid object injection
          // eslint-disable-next-line security/detect-object-injection
          if (accessLevel.hasOwnProperty(key) && !accessLevel[key]) {
            const permissionIndex = groupToUpdate.permissions.findIndex(
              (permission: PermissionEntity) => permission.accessLevel === key && tableName === permission.tableName,
            );
            if (permissionIndex >= 0) {
              const permissionInGroup = groupToUpdate.permissions.at(permissionIndex);
              const deletedPermission = await this._dbContext.permissionRepository.removePermissionEntity(
                permissionInGroup,
              );
              deletedPermissions.push(deletedPermission);
            }
          }
        }
      }),
    );
    await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);

    //create truthy permissions
    const createdPermissions: Array<PermissionEntity> = [];
    await Promise.all(
      tablePermissions.map(async (tablePermission: TablePermissionDs) => {
        const { accessLevel, tableName } = tablePermission;
        for (const key in accessLevel) {
          // has own property check added to avoid object injection
          // eslint-disable-next-line security/detect-object-injection
          if (accessLevel.hasOwnProperty(key) && accessLevel[key]) {
            const permissionIndex = groupToUpdate.permissions.findIndex(
              (permission: PermissionEntity) => permission.accessLevel === key && tableName === permission.tableName,
            );
            if (permissionIndex < 0) {
              const permissionEntity = new PermissionEntity();
              permissionEntity.type = PermissionTypeEnum.Table;
              permissionEntity.accessLevel = key;
              permissionEntity.tableName = tableName;
              groupToUpdate.permissions.push(permissionEntity);
              const createdPermission = await this._dbContext.permissionRepository.saveNewOrUpdatedPermission(
                permissionEntity,
              );
              createdPermissions.push(createdPermission);
            }
          }
        }
      }),
    );
    await this._dbContext.groupRepository.saveNewOrUpdatedGroup(groupToUpdate);
    resultPermissions.tables = buildFinalTablesPermissions(
      allTablePermissionsInGroup,
      deletedPermissions,
      createdPermissions,
    );
    return resultPermissions;
  }
}
