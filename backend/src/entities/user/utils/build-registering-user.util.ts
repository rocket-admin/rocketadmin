import { RegisterUserDs } from '../application/data-structures/register-user-ds.js';
import { UserRoleEnum } from '../enums/user-role.enum.js';
import { UserEntity } from '../user.entity.js';

export function buildRegisteringUser(userData: RegisterUserDs): UserEntity {
  const newUser: UserEntity = new UserEntity();
  newUser.gclid = userData.gclidValue;
  newUser.email = userData.email?.toLowerCase();
  newUser.password = userData.password;
  newUser.isActive = userData.isActive;
  newUser.name = userData.name;
  newUser.role = userData.role ? userData.role : UserRoleEnum.USER;
  return newUser;
}
