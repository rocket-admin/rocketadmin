import { GroupEntity } from '../group.entity.js';
import { RemoveUserFromGroupResultDs } from '../application/data-sctructures/remove-user-from-group-result.ds.js';
import { UserEntity } from '../../user/user.entity.js';

export function buildRemoveUserFromGroupResultDs(group: GroupEntity): RemoveUserFromGroupResultDs {
  return {
    id: group.id,
    isMain: group.isMain,
    title: group.title,
    users: group.users.map((u: UserEntity) => {
      return {
        id: u.id,
        email: u.email,
        createdAt: u.createdAt,
        isActive: u.isActive,
      };
    }),
  };
}
