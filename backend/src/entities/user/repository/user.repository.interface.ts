import { CreateUserDs } from '../application/data-structures/create-user.ds.js';
import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { UserEntity } from '../user.entity.js';

export interface IUserRepository {
  createUser(userData: CreateUserDs): Promise<UserEntity>;

  findOneUserById(userId: string): Promise<UserEntity>;

  findOneUserWithUserAction(userId: string): Promise<UserEntity>;

  findOneUserByEmail(email: string): Promise<UserEntity>;

  findUserWithConnections(userId: string): Promise<UserEntity>;

  findAllUsersInConnection(connectionId: string): Promise<Array<Omit<UserEntity, 'connections' | 'groups'>>>;

  saveRegisteringUser(userData: RegisterUserDs): Promise<UserEntity>;

  saveUserEntity(user: UserEntity): Promise<UserEntity>;

  findOneUserWithEmailVerification(userId: string): Promise<UserEntity>;

  findUserByEmailWithEmailVerificationAndInvitation(email: string): Promise<UserEntity>;

  deleteUserEntity(user: UserEntity): Promise<UserEntity>;

  getUsersWithNotNullGCLIDsInTwoWeeks(): Promise<Array<UserEntity>>;

  getUserEmailOrReturnNull(userId: string): Promise<string>;

  getTrue(): Promise<boolean>;

  findUsersWithoutLogs(): Promise<Array<UserEntity>>;

  checkOwnerInviteAbility(ownerId: string, usersCount: number): Promise<boolean>;
}
