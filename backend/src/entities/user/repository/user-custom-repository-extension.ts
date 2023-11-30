import { Constants } from '../../../helpers/constants/constants.js';
import { CreateUserDs } from '../application/data-structures/create-user.ds.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
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

  async saveRegisteringUser(userData: RegisterUserDs): Promise<UserEntity> {
    const newUser: UserEntity = new UserEntity();
    newUser.gclid = userData.gclidValue;
    newUser.email = userData.email;
    newUser.password = userData.password;
    newUser.isActive = userData.isActive;
    newUser.name = userData.name;
    newUser.role = userData.role ? userData.role : UserRoleEnum.USER;
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

  async findOneUserByEmail(email: string): Promise<UserEntity | null> {
    const userQb = this.createQueryBuilder('user').where('user.email = :userEmail', { userEmail: email });
    return userQb.getOne();
  },

  async findOneUserWithEmailVerification(userId: string): Promise<UserEntity> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .where('user.id = :userId', { userId: userId });
    return await usersQb.getOne();
  },

  async findUserByEmailEndCompanyIdWithEmailVerificationAndInvitation(
    email: string,
    companyId?: string,
  ): Promise<UserEntity> {
    const usersQb = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .leftJoinAndSelect('user.user_invitation', 'user_invitation')
      .leftJoinAndSelect('user.company', 'company')
      .where('user.email = :userEmail', { userEmail: email });
    if (companyId) {
      usersQb.andWhere('company.id = :companyId', { companyId: companyId });
    }
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
      .andWhere('user.gclid IS NOT NULL');
    return await usersQB.getMany();
  },

  async getUserEmailOrReturnNull(userId: string): Promise<string> {
    const userQB = this.createQueryBuilder('user').where('user.id = :userId', { userId: userId });
    const user = await userQB.getOne();
    return user?.email ? user.email : null;
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
      .where('user.email = :userEmail', { userEmail: userEmail });
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

  async findAllUsersWithEmail(email: string): Promise<Array<UserEntity>> {
    const usersQb = this.createQueryBuilder('user').where('user.email = :userEmail', { userEmail: email });
    return await usersQb.getMany();
  },

  async bulkSaveUpdatedUsers(updatedUsers: Array<UserEntity>): Promise<Array<UserEntity>> {
    return await this.save(updatedUsers);
  }
};
