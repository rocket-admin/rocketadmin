import { CreateUserDs } from '../application/data-structures/create-user.ds.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../enums/external-registration-provider.enum.js';
import { UserEntity } from '../user.entity.js';

export interface IUserRepository {
  createUser(userData: CreateUserDs): Promise<UserEntity>;

  findOneUserById(userId: string): Promise<UserEntity>;

  findOneUserWithUserAction(userId: string): Promise<UserEntity>;

  findOneUserByEmail(
    email: string,
    externalRegistrationProvider?: ExternalRegistrationProviderEnum,
  ): Promise<UserEntity>;

  findUserWithConnections(userId: string): Promise<UserEntity>;

  findAllUsersInConnection(connectionId: string): Promise<Array<Omit<UserEntity, 'connections' | 'groups'>>>;

  saveRegisteringUser(
    userData: RegisterUserDs,
    externalRegistrationProvider?: ExternalRegistrationProviderEnum,
  ): Promise<UserEntity>;

  saveUserEntity(user: UserEntity): Promise<UserEntity>;

  findOneUserWithEmailVerification(userId: string): Promise<UserEntity>;

  findUserByEmailEndCompanyIdWithEmailVerificationAndInvitation(email: string, companyId: string): Promise<UserEntity>;

  deleteUserEntity(user: UserEntity): Promise<UserEntity>;

  getUsersWithNotNullGCLIDsInTwoWeeks(): Promise<Array<UserEntity>>;

  getUserEmailOrReturnNull(userId: string): Promise<string>;

  getTrue(): Promise<boolean>;

  findUsersWithoutLogs(): Promise<Array<UserEntity>>;

  findOneUserByGitHubId(gitHubId: number): Promise<UserEntity>;

  findOneUserByEmailAndCompanyId(email: string, companyId: string): Promise<UserEntity>;

  findOneUserByIdAndCompanyId(userId: string, companyId: string): Promise<UserEntity>;

  findOneUserByIdWithCompany(userId: string): Promise<UserEntity>;

  findAllUsersWithEmail(email: string, externalProvider?: ExternalRegistrationProviderEnum): Promise<Array<UserEntity>>;

  findUsersByEmailsAndCompanyId(emails: Array<string>, companyId: string): Promise<Array<UserEntity>>;

  suspendUsers(userIds: Array<string>): Promise<Array<UserEntity>>;

  unSuspendUsers(userIds: Array<string>): Promise<Array<UserEntity>>;

  bulkSaveUpdatedUsers(updatedUsers: Array<UserEntity>): Promise<Array<UserEntity>>;
}
