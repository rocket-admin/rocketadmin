import { UserEntity } from '../../../entities/user/user.entity.js';
import { FoundUserInfoRO, FoundUserInfoWithoutCompanyRO } from '../data-structures/found-user-info.ro.js';

export function buildFoundUserInfoRO(user: UserEntity): FoundUserInfoRO {
	const { password: _password, otpSecretKey: _otpSecretKey, ...userInfo } = user;
	return userInfo;
}

export function buildFoundUserInfoWithoutCompanyRO(user: UserEntity): FoundUserInfoWithoutCompanyRO {
	const { password: _password, company: _company, otpSecretKey: _otpSecretKey, ...userInfo } = user;
	return userInfo;
}
