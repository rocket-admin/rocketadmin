import { UserEntity } from '../user.entity';
import { CreatedUserDs } from '../application/data-structures/created-user.ds';

export function buildCreatedUserDs(user: UserEntity): CreatedUserDs {
  return {
    user: {
      id: user.id,
      createdAt: user.createdAt,
    },
  };
}
