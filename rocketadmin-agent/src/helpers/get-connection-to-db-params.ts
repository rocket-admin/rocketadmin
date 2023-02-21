import { ICLIConnectionCredentials } from '../interfaces/interfaces';
import { toPrettyErrorsMsg } from './to-pretty-errors-msg';
import { validateConnectionData } from './validate-connection-data';
import { Config } from '../shared/config/config';

export async function getConnectionToDbParams(): Promise<ICLIConnectionCredentials> {
  const connectionCredentials = Config.getConnectionConfig();
  const errors = validateConnectionData(connectionCredentials);
  if (errors.length > 0) {
    console.error(toPrettyErrorsMsg(errors));
    process.exit(0);
  }
  return connectionCredentials;
}
