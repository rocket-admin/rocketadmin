import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { IDataAccessObjectAgent } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object-agent.interface.js';

export function createDataAccessObject(
  connection: ConnectionEntity,
  _userId,
): IDataAccessObject | IDataAccessObjectAgent {
  return getDataAccessObject(connection);
}
