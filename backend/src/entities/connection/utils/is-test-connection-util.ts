import { ConnectionEntity } from '../connection.entity';
import { Constants } from '../../../helpers/constants/constants';
import { CreatedConnectionDs } from '../application/data-structures/created-connection.ds';

export function isTestConnectionUtil(connection: ConnectionEntity | CreatedConnectionDs): boolean {
  if (connection.isTestConnection) {
    return true;
  }
  return isHostTest(connection.host);
}

export function isHostTest(hostname: string): boolean {
  const testConnectionsHosts = Constants.getTestConnectionsArr().map((el) => el.host);
  return testConnectionsHosts.includes(hostname);
}
