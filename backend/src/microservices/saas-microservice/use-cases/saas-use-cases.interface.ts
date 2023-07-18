import { UserEntity } from '../../../entities/user/user.entity.js';
import { RegisterCompanyWebhookDS } from '../data-structures/register-company.ds.js';
import { RegisteredCompanyDS } from '../data-structures/registered-company.ds.js';

export interface ICompanyRegistration {
  execute(inputData: RegisterCompanyWebhookDS): Promise<RegisteredCompanyDS>;
}

export interface IGetUserInfo {
  execute(userId: string): Promise<UserEntity>;
}
