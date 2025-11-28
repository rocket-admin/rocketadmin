import { SimpleFoundUserInfoDs } from '../dto/found-user.dto.js';
import { UserEntity } from '../user.entity.js';

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
