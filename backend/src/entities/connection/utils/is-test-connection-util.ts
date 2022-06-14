import { ConnectionEntity } from '../connection.entity';
import { Constants } from '../../../helpers/constants/constants';
import { CreatedConnectionDs } from '../application/data-structures/created-connection.ds';
import { getRepository } from 'typeorm';

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

export async function isTestConnectionById(connectionId: string): Promise<boolean> {
  const qb = await getRepository(ConnectionEntity)
    .createQueryBuilder('connection')
    .where('connection.id = :connectionId', { connectionId: connectionId });
  const foundConnection = await qb.getOne();
  return isTestConnectionUtil(foundConnection);
}
