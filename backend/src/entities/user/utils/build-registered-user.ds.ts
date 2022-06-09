import { UserEntity } from '../user.entity';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds';
import { generateGwtToken } from './generate-gwt-token';

export function buildRegisteredUserDS(user: UserEntity): RegisteredUserDs {
  const jwtToken = generateGwtToken(user);
  return {
    id: user.id,
    email: user.email,
    token: jwtToken,
  };
}
