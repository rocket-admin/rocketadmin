import { UserEntity } from '../user.entity';
import { FoundUserInGroupDs } from '../application/data-structures/found-user-in-group.ds';

export function buildFoundUserInGroupDs(user: UserEntity): FoundUserInGroupDs {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    isActive: user.isActive,
  };
}
