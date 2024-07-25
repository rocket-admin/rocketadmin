import { Constants } from '../../../helpers/constants/constants.js';
import { CreatedConnectionDTO } from '../application/dto/created-connection.dto.js';
import { ConnectionEntity } from '../connection.entity.js';

export function isTestConnectionUtil(connection: ConnectionEntity | CreatedConnectionDTO): boolean {
  if (connection.isTestConnection) {
    return true;
  }
  return isHostTest(connection.host);
}

export function isHostTest(hostname: string): boolean {
  const testConnectionsHosts = Constants.getTestConnectionsArr().map((el) => el.host);
  return testConnectionsHosts.includes(hostname);
}
