import { ConnectionEntity } from '../../entities/connection/connection.entity.js';
import { IDataAccessObject } from './data-access-object-interface.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';

export function createDataAccessObject(connection: ConnectionEntity, _userId): IDataAccessObject {
  return getDataAccessObject(connection) as any;
}
