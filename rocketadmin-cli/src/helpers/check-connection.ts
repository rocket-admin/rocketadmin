import { ICLIConnectionCredentials } from '../interfaces/interfaces.js';
import { createDao } from '../dal/shared/create-dao.js';
import { TestConnectionResultDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/test-result-connection.ds.js';

export async function checkConnection(connection: ICLIConnectionCredentials): Promise<TestConnectionResultDS> {
  console.log('-> Test connection to database');
  const dao = createDao(connection);
  const result = await dao.testConnect();
  if (result.result) {
    console.log('-> Database successfully connected');
  } else {
    console.log(`-> Connection to database failed with error: ${result.message ? result.message : 'unknown error'}`);
  }
  return result;
}
