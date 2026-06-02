import { UserEntity } from '../../../entities/user/user.entity.js';
import { FoundUserInfoRO, FoundUserInfoWithoutCompanyRO } from '../data-structures/found-user-info.ro.js';

export function buildFoundUserInfoRO(user: UserEntity): FoundUserInfoRO {
	const { password: _password, ...userInfo } = user;
	return userInfo;
}

export function buildFoundUserInfoWithoutCompanyRO(user: UserEntity): FoundUserInfoWithoutCompanyRO {
	const { password: _password, company: _company, ...userInfo } = user;
	return userInfo;
}
