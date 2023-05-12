import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { IDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/interfaces/data-access-object.interface.js';
import { ICLIConnectionCredentials } from '../../interfaces/interfaces.js';

export function createDao(connection: ICLIConnectionCredentials): IDataAccessObject {
  return getDataAccessObject(connection) as unknown as IDataAccessObject;
}
