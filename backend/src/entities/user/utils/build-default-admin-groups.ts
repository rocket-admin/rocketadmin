import { UserEntity } from '../user.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { ConnectionEntity } from '../../connection/connection.entity.js';

export function buildDefaultAdminGroups(user: UserEntity, connections: Array<ConnectionEntity>): Array<GroupEntity> {
  const createdGroups: Array<GroupEntity> = [];
  for (const connection of connections) {
    const group = new GroupEntity();
    group.title = 'Admin';
    group.isMain = true;
    group.users = [user];
    group.connection = connection;
    group.permissions = [];
    createdGroups.push(group);
  }
  return createdGroups;
}
