import { UserEntity } from '../user.entity.js';
import { CreatedUserDs } from '../application/data-structures/created-user.ds.js';
import { SimpleFoundUserInfoDs } from '../application/data-structures/found-user.ds.js';

export function buildCreatedUserDs(user: UserEntity): CreatedUserDs {
  return {
    user: {
      id: user.id,
      createdAt: user.createdAt,
    },
  };
}

export function buildSimpleUserInfoDs(user: UserEntity): SimpleFoundUserInfoDs {
  return {
    id: user.id,
    isActive: user.isActive,
    email: user.email,
    createdAt: user.createdAt,
    name: user.name,
    is_2fa_enabled: user.isOTPEnabled,
    role: user.role,
  };
}
