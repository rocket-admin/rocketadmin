import { ConnectionEntity } from '../connection.entity.js';
import { UserEntity } from '../../user/user.entity.js';
import { GroupEntity } from '../../group/group.entity.js';

export function buildNewGroupEntityForConnectionWithUser(
  connection: ConnectionEntity,
  user: UserEntity,
  groupTitle: string,
): GroupEntity {
  const newGroup = new GroupEntity();
  newGroup.title = groupTitle ? groupTitle : 'New group';
  newGroup.permissions = [];
  newGroup.users = [user];
  newGroup.connection = connection;
  newGroup.isMain = false;
  return newGroup;
}
