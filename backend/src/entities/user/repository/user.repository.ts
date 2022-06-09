import { EntityRepository, getRepository, Repository } from 'typeorm';
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
    return await this.findOne({ id: userId });
  }

  public async findOneUserWithUserAction(userId: string): Promise<UserEntity> {
    const userQb = await getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.user_action', 'user_action')
      .andWhere('user.id = :userId', { userId: userId });
    return await userQb.getOne();
  }

  public async findOneUserByEmail(email: string): Promise<UserEntity | null> {
    return await this.findOne({ email: email });
  }

  public async findUserWithConnections(userId: string): Promise<UserEntity> {
    return await this.findOne({
      where: { id: userId },
      relations: ['connections'],
    });
  }

  public async findOneUserWithEmailVerification(userId: string): Promise<UserEntity> {
    const usersQb = await getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .where('user.id = :userId', { userId: userId });
    return await usersQb.getOne();
  }

  public async findUserByEmailWithEmailVerificationAndInvitation(email: string): Promise<UserEntity> {
    const usersQb = await getRepository(UserEntity)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.email_verification', 'email_verification')
      .leftJoinAndSelect('user.user_invitation', 'user_invitation')
      .where('user.email = :userEmail', { userEmail: email });
    return await usersQb.getOne();
  }

  public async findAllUsersInConnection(
    connectionId: string,
  ): Promise<Array<Omit<UserEntity, 'connections' | 'groups'>>> {
    const usersQb = await getRepository(UserEntity)
      .createQueryBuilder('user')
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
    const usersQB = await getRepository(UserEntity)
      .createQueryBuilder('user')
      .where('user.createdAt > :date', { date: dateTwoWeeksAgo })
      .andWhere('user.gclid IS NOT NULL');
    return await usersQB.getMany();
  }

  public async getTrue(): Promise<boolean> {
    return !!(await this.manager.query(`SELECT (1);`));
  }
}
