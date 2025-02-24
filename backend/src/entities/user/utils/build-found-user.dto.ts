import { FoundUserDto } from '../dto/found-user.dto.js';
import { UserEntity } from '../user.entity.js';

export function buildFoundUserDto(user: UserEntity): FoundUserDto {
  return {
    id: user.id,
    isActive: user.isActive,
    email: user.email,
    createdAt: user.createdAt,
    name: user.name,
    suspended: user.suspended,
    role: user.role,
    is_2fa_enabled: user.otpSecretKey !== null && user.isOTPEnabled,
    externalRegistrationProvider: user.externalRegistrationProvider,
    show_test_connections: user.showTestConnections,
  };
}
