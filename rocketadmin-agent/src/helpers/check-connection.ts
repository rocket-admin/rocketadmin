import { ICLIConnectionCredentials } from '../interfaces/interfaces.js';
import { createDao } from '../dal/shared/create-dao.js';
import { ITestConnectResult } from '../dal/shared/dao-interface.js';

export async function checkConnection(connection: ICLIConnectionCredentials): Promise<ITestConnectResult> {
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
