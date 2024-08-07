import { UserEntity } from '../user.entity.js';
import { CreatedUserDs } from '../application/data-structures/created-user.ds.js';
import { SimpleFoundUserInfoDs } from '../dto/found-user.dto.js';

export function buildCreatedUserDs(user: UserEntity): CreatedUserDs {
  return {
    user: {
      id: user.id,
      createdAt: user.createdAt,
    },
  };
}

export function buildSimpleUserInfoDs(user: UserEntity): SimpleFoundUserInfoDs {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    isActive: user.isActive,
    email: user.email,
    createdAt: user.createdAt,
    suspended: user.suspended,
    name: user.name,
    is_2fa_enabled: user.isOTPEnabled,
    role: user.role,
    externalRegistrationProvider: user.externalRegistrationProvider,
  };
}
