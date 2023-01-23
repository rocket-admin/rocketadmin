import { UserEntity } from '../user.entity.js';
import { RegisteredUserDs } from '../application/data-structures/registered-user.ds.js';
import { generateGwtToken } from './generate-gwt-token.js';

export function buildRegisteredUserDS(user: UserEntity): RegisteredUserDs {
  const jwtToken = generateGwtToken(user);
  return {
    id: user.id,
    email: user.email,
    token: jwtToken,
    name: user.name,
  };
}
