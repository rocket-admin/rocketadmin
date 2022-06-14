import { ConnectionEntity } from '../entities/connection/connection.entity';
import { CreateConnectionDto } from '../entities/connection/dto';
import { Constants } from './constants/constants';

export function isTestConnection(connection: ConnectionEntity | CreateConnectionDto): boolean {
  if (connection.isTestConnection) {
    return true;
  }
  const testHosts = Constants.getTestConnectionsHostNamesArr();
  return testHosts.includes(connection.host);
}
