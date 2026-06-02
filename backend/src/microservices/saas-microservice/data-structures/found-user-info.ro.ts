import { UserEntity } from '../../../entities/user/user.entity.js';

type DataKeys<T> = { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? never : K }[keyof T];
export type FoundUserInfoRO = Omit<Pick<UserEntity, DataKeys<UserEntity>>, 'password' | 'otpSecretKey'>;
export type FoundUserInfoWithoutCompanyRO = Omit<FoundUserInfoRO, 'company'>;
