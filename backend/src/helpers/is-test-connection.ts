import { ConnectionEntity } from '../entities/connection/connection.entity.js';
import { CreateConnectionDto } from '../entities/connection/dto/index.js';
import { Constants } from './constants/constants.js';

export function isTestConnection(connection: ConnectionEntity | CreateConnectionDto): boolean {
  if (connection.isTestConnection) {
    return true;
  }
  const testHosts = Constants.getTestConnectionsHostNamesArr();
  return testHosts.includes(connection.host);
}
