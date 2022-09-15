import { EntityRepository, QueryRunner, Repository } from 'typeorm';
import { IUserRepository } from './user.repository.interface';
import { UserEntity } from '../user.entity';
import { CreateUserDs } from '../application/data-structures/create-user.ds';
import { StripeUtil } from '../utils/stripe-util';
import { RegisterUserDs } from '../application/data-structures/register-user-ds';
import { Constants } from '../../../helpers/constants/constants';

@EntityRepository(UserEntity)
export class UserRepository extends Repository<UserEntity> implements IUserRepository {
  constructor() {
    super();
  }

  public async createUser(userData: CreateUserDs): Promise<UserEntity> {
    const newUser: UserEntity = new UserEntity();
    newUser.id = userData.id;
    newUser.isActive = true;
    newUser.gclid = userData.gclidValue;
    newUser.connections = [];
    let savedUser = await this.save(newUser);
    if (savedUser && process.env.NODE_ENV !== 'test') {
      savedUser.stripeId = await StripeUtil.createUserStripeCustomerAndReturnStripeId(savedUser.id);
    }
    savedUser = await this.save(newUser);
    return savedUser;
  }

  public async saveRegisteringUser(userData: RegisterUserDs): Promise<UserEntity> {
    const newUser: UserEntity = new UserEntity();
    newUser.gclid = userData.gclidValue;
    newUser.email = userData.email;
    newUser.password = userData.password;
    newUser.isActive = userData.isActive;
    newUser.connections = [];
    let savedUser = await this.save(newUser);
    if (savedUser && process.env.NODE_ENV !== 'test') {
      savedUser.stripeId = await StripeUtil.createStripeCustomerAndGetIdByEmailAndId(savedUser.email, savedUser.id);
    }
    savedUser = await this.save(newUser);
    return savedUser;
  }

  public async findOneUserById(userId: string): Promise<UserEntity | null> {
    const userQb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .andWhere('user.id = :userId', { userId: userId });
    return await userQb.getOne();
  }

  public async findOneUserWithUserAction(userId: string): Promise<UserEntity> {
    const userQb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .leftJoinAndSelect('user.user_action', 'user_action')
      .andWhere('user.id = :userId', { userId: userId });
    return await userQb.getOne();
  }

  public async findOneUserByEmail(email: string): Promise<UserEntity | null> {
    const userQb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .where('user.email = :userEmail', { userEmail: email });
    return userQb.getOne();
  }

  public async findOneUserWithEmailVerification(userId: string): Promise<UserEntity> {
    const usersQb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .where('user.id = :userId', { userId: userId });
    return await usersQb.getOne();
  }

  public async findUserByEmailWithEmailVerificationAndInvitation(email: string): Promise<UserEntity> {
    const usersQb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .leftJoinAndSelect('user.user_invitation', 'user_invitation')
      .where('user.email = :userEmail', { userEmail: email });
    return await usersQb.getOne();
  }

  public async findAllUsersInConnection(
    connectionId: string,
  ): Promise<Array<Omit<UserEntity, 'connections' | 'groups'>>> {
    const usersQb = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
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
  }

  public async saveUserEntity(user: UserEntity): Promise<UserEntity> {
    return await this.save(user);
  }

  public async deleteUserEntity(user: UserEntity): Promise<UserEntity> {
    return await this.remove(user);
  }

  public async getUsersWithNotNullGCLIDsInTwoWeeks(): Promise<Array<UserEntity>> {
    const dateTwoWeeksAgo = Constants.TWO_WEEKS_AGO();
    const usersQB = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .where('user.createdAt > :date', { date: dateTwoWeeksAgo })
      .andWhere('user.gclid IS NOT NULL');
    return await usersQB.getMany();
  }

  public async getUserEmailOrReturnNull(userId: string): Promise<string> {
    const userQB = this.createQueryBuilder(undefined, this.getCurrentQueryRunner())
      .select('user')
      .from(UserEntity, 'user')
      .where('user.id > :userId', { id: userId });
    const user = await userQB.getOne();
    return user?.email ? user.email : null;
  }

  public async getTrue(): Promise<boolean> {
    return !!(await this.manager.query(`SELECT (1);`));
  }

  private getCurrentQueryRunner(): QueryRunner {
    return this.manager.queryRunner;
  }
}
