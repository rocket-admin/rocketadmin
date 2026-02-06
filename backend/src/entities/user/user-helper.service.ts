import { Injectable } from '@nestjs/common';
import { FoundUserInGroupDs } from './application/data-structures/found-user-in-group.ds.js';
import { FoundUserDto } from './dto/found-user.dto.js';
import { UserEntity } from './user.entity.js';
import { getUserIntercomHash } from './utils/get-user-intercom-hash.js';

@Injectable()
export class UserHelperService {
	public buildFoundUserInGroupDs(user: UserEntity): FoundUserInGroupDs {
		return {
			id: user.id,
			email: user.email,
			createdAt: user.createdAt,
			isActive: user.isActive,
			name: user.name,
			suspended: user.suspended,
			externalRegistrationProvider: user.externalRegistrationProvider,
		};
	}

	public async buildFoundUserDs(user: UserEntity): Promise<FoundUserDto> {
		const intercomHash = getUserIntercomHash(user.id);
		return {
			id: user.id,
			createdAt: user.createdAt,
			suspended: user.suspended,
			isActive: user.isActive,
			email: user.email,
			intercom_hash: intercomHash,
			name: user.name,
			role: user.role,
			is_2fa_enabled: user.otpSecretKey !== null && user.isOTPEnabled,
			company: user.company ? { id: user.company.id } : null,
			externalRegistrationProvider: user.externalRegistrationProvider,
			show_test_connections: user.showTestConnections,
		};
	}
}
