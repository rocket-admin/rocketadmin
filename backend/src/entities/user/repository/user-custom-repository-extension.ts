import { Constants } from '../../../helpers/constants/constants.js';
import { CreateUserDs } from '../application/data-structures/create-user.ds.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../enums/external-registration-provider.enum.js';
import { UserRoleEnum } from '../enums/user-role.enum.js';
import { UserEntity } from '../user.entity.js';
import { IUserRepository } from './user.repository.interface.js';

export const userCustomRepositoryExtension: IUserRepository = {
  async createUser(userData: CreateUserDs): Promise<UserEntity> {
    const newUser: UserEntity = new UserEntity();
    newUser.id = userData.id;
    newUser.isActive = true;
    newUser.gclid = userData.gclidValue;
    return await this.save(newUser);
  },

  async saveRegisteringUser(
    userData: RegisterUserDs,
    externalRegistrationProvider: ExternalRegistrationProviderEnum = null,
  ): Promise<UserEntity> {
    const newUser: UserEntity = new UserEntity();
    newUser.gclid = userData.gclidValue;
    newUser.email = userData.email.toLowerCase();
    newUser.password = userData.password;
    newUser.isActive = userData.isActive;
    newUser.name = userData.name;
    newUser.role = userData.role ? userData.role : UserRoleEnum.USER;
    newUser.externalRegistrationProvider = externalRegistrationProvider;
    return await this.save(newUser);
  },

  async findOneUserById(userId: string): Promise<UserEntity | null> {
    const userQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .andWhere('user.id = :userId', { userId: userId });
    return await userQb.getOne();
  },

  async findOneUserWithUserAction(userId: string): Promise<UserEntity> {
    const userQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.user_action', 'user_action')
      .andWhere('user.id = :userId', { userId: userId });
    return await userQb.getOne();
  },

  async findOneUserByEmail(
    email: string,
    externalRegistrationProvider: ExternalRegistrationProviderEnum = null,
    samlNameId: string = null,
  ): Promise<UserEntity | null> {
    const userQb = this.createQueryBuilder('user').where('user.email = :userEmail', {
      userEmail: email?.toLowerCase(),
    });
    if (externalRegistrationProvider) {
      userQb.andWhere('user.externalRegistrationProvider = :externalRegistrationProvider', {
        externalRegistrationProvider: externalRegistrationProvider,
      });
    }
    if (samlNameId && externalRegistrationProvider === ExternalRegistrationProviderEnum.SAML) {
      userQb.andWhere('user.samlNameId = :samlNameId', { samlNameId: samlNameId });
    }
    return userQb.getOne();
  },

  async findOneUserByEmailAndGroupId(email: string, groupId: string): Promise<UserEntity> {
    const userQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .where('user.email = :userEmail', { userEmail: email?.toLowerCase() })
      .andWhere('group.id = :groupId', { groupId: groupId });
    return await userQb.getOne();
  },

  async findOneUserWithEmailVerification(userId: string): Promise<UserEntity> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .where('user.id = :userId', { userId: userId });
    return await usersQb.getOne();
  },

  async findUserByEmailEndCompanyIdWithEmailVerificationAndInvitation(
    email: string,
    companyId: string,
  ): Promise<UserEntity> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .leftJoinAndSelect('user.user_invitation', 'user_invitation')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.email = :userEmail', { userEmail: email?.toLowerCase() })
      .andWhere('company.id = :companyId', { companyId: companyId });
    return await usersQb.getOne();
  },

  async findAllUsersInConnection(connectionId: string): Promise<Array<Omit<UserEntity, 'connections' | 'groups'>>> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .andWhere('connection.id = :connectionId', {
        connectionId: connectionId,
      });
    const foundUsers = await usersQb.getMany();
    return foundUsers.map((user: UserEntity) => {
      delete user.connections;
      delete user.groups;
      return user;
    });
  },

  async saveUserEntity(user: UserEntity): Promise<UserEntity> {
    return await this.save(user);
  },

  async deleteUserEntity(user: UserEntity): Promise<UserEntity> {
    return await this.remove(user);
  },

  async getUsersWithNotNullGCLIDsInTwoWeeks(): Promise<Array<UserEntity>> {
    const dateTwoWeeksAgo = Constants.TWO_WEEKS_AGO();
    const usersQB = this.createQueryBuilder('user')
      .where('user.createdAt > :date', { date: dateTwoWeeksAgo })
      .andWhere('user.gclid IS NOT NULL')
      .andWhere('user.isDemoAccount = :isDemo', { isDemo: false });
    return await usersQB.getMany();
  },

  async countUsersInCompany(companyId: string): Promise<number> {
    const usersQB = this.createQueryBuilder('user')
      .leftJoin('user.company', 'company')
      .where('company.id = :companyId', { companyId: companyId });
    return await usersQB.getCount();
  },

  async getUserEmailOrReturnNull(userId: string): Promise<string> {
    const userQB = this.createQueryBuilder('user').where('user.id = :userId', { userId: userId });
    const user = await userQB.getOne();
    return user?.email ? user.email.toLowerCase() : null;
  },

  async getTrue(): Promise<boolean> {
    return !!(await this.manager.query(`SELECT (1);`));
  },

  async findUserWithConnections(userId: string): Promise<UserEntity> {
    return await this.findOne({
      where: { id: userId },
      relations: ['connections'],
    });
  },

  async findUsersWithoutLogs(): Promise<Array<UserEntity>> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .leftJoinAndSelect('connection.logs', 'tableLogs')
      .leftJoinAndSelect('user.user_action', 'user_action')
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
      .orWhere('user_action.id is null')
      .andWhere('tableLogs.id is null');
    return await usersQb.getMany();
  },

  async findOneUserByGitHubId(gitHubId: number): Promise<UserEntity> {
    const userQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.github_user_identifier', 'github_user_identifier')
      .where('github_user_identifier.gitHubId = :gitHubId', { gitHubId: gitHubId });
    return await userQb.getOne();
  },

  async findOneUserByEmailAndCompanyId(userEmail: string, companyId: string): Promise<UserEntity> {
    const userQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.email = :userEmail', { userEmail: userEmail?.toLowerCase() });
    if (companyId) {
      userQb.andWhere('company.id = :companyId', { companyId: companyId });
    } else {
      userQb.andWhere('company.id is null');
    }
    return await userQb.getOne();
  },

  async findOneUserByIdAndCompanyId(userId: string, companyId: string): Promise<UserEntity> {
    const userQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.id = :userId', { userId: userId })
      .andWhere('company.id = :companyId', { companyId: companyId });
    return await userQb.getOne();
  },

  async findOneUserByIdWithCompany(userId: string): Promise<UserEntity> {
    const userQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.id = :userId', { userId: userId });
    return await userQb.getOne();
  },

  async findAllUsersWithEmail(
    email: string,
    externalRegistrationProvider: ExternalRegistrationProviderEnum = null,
  ): Promise<Array<UserEntity>> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.email = :userEmail', {
        userEmail: email?.toLowerCase(),
      });
    if (externalRegistrationProvider) {
      usersQb.andWhere('user.externalRegistrationProvider = :externalRegistrationProvider', {
        externalRegistrationProvider: externalRegistrationProvider,
      });
    }

    return await usersQb.getMany();
  },

  async findUsersByEmailsAndCompanyId(usersEmails: Array<string>, companyId: string): Promise<Array<UserEntity>> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.email IN (:...userEmails)', { userEmails: usersEmails.map((email) => email?.toLowerCase()) })
      .andWhere('company.id = :companyId', { companyId: companyId });
    return await usersQb.getMany();
  },

  async suspendUsers(userIds: Array<string>): Promise<Array<UserEntity>> {
    const usersQb = this.createQueryBuilder('user')
      .update()
      .set({ suspended: true })
      .where('id IN (:...userIds)', { userIds: userIds });
    await usersQb.execute();
    return await this.createQueryBuilder('user').whereInIds(userIds).getMany();
  },

  async suspendNewestUsersInCompany(companyId: string, unsuspendedUsersLeft: number = 3): Promise<Array<UserEntity>> {
    const usersQb = this.createQueryBuilder('user')
      .where('user.companyId = :companyId', { companyId: companyId })
      .orderBy('user.createdAt', 'ASC');
    const users: Array<UserEntity> = await usersQb.getMany();
    const usersToSuspend = users.slice(unsuspendedUsersLeft);

    if (usersToSuspend.length > 0) {
      await this.createQueryBuilder('user')
        .update()
        .set({ suspended: true })
        .where('id IN (:...userIds)', { userIds: usersToSuspend.map((user) => user.id) })
        .execute();
    }
    return usersToSuspend;
  },

  async unSuspendUsers(userIds: Array<string>): Promise<Array<UserEntity>> {
    const usersQb = this.createQueryBuilder('user')
      .update()
      .set({ suspended: false })
      .where('id IN (:...userIds)', { userIds: userIds });
    await usersQb.execute();
    return await this.createQueryBuilder('user').whereInIds(userIds).getMany();
  },

  async bulkSaveUpdatedUsers(updatedUsers: Array<UserEntity>): Promise<Array<UserEntity>> {
    return await this.save(updatedUsers);
  },
};
