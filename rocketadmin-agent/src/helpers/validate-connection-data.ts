import { ConnectionTypesEnum } from '@rocketadmin/shared-code/src/shared/enums/connection-types-enum.js';
import { ICLIConnectionCredentials } from '../interfaces/interfaces.js';
import { Messages } from '../text/messages.js';

export function validateConnectionData(connectionData: ICLIConnectionCredentials): Array<string> {
  const errors = [];

  function validateConnectionType(type: string): string {
    return Object.keys(ConnectionTypesEnum).find((key) => key === type);
  }

  if (!validateConnectionType(connectionData.type)) errors.push(Messages.CONNECTION_TYPE_INVALID);
  if (!connectionData.type) errors.push(Messages.TYPE_MISSING);
  if (!connectionData.host) errors.push(Messages.HOST_MISSING);
  if (connectionData.port < 0 || connectionData.port > 65535 || !connectionData.port)
    errors.push(Messages.PORT_MISSING);
  if (typeof connectionData.port !== 'number') errors.push(Messages.PORT_FORMAT_INCORRECT);
  if (typeof connectionData.ssl !== 'boolean') errors.push(Messages.SSL_FORMAT_INCORRECT);
  if (!connectionData.username && connectionData.type !== ConnectionTypesEnum.redis)
    errors.push(Messages.USERNAME_MISSING);
  if (!connectionData.database && connectionData.type !== ConnectionTypesEnum.redis)
    errors.push(Messages.DATABASE_MISSING);
  if (!connectionData.token) errors.push(Messages.CONNECTION_TOKEN_MISSING);
  return errors;
}
