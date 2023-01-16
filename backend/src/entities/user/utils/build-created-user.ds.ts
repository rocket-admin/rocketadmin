import { UserEntity } from '../user.entity.js';
import { CreatedUserDs } from '../application/data-structures/created-user.ds.js';

export function buildCreatedUserDs(user: UserEntity): CreatedUserDs {
  return {
    user: {
      id: user.id,
      createdAt: user.createdAt,
    },
  };
}
