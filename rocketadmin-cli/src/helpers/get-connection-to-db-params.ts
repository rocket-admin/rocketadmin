import { ICLIConnectionCredentials } from '../interfaces/interfaces.js';
import { toPrettyErrorsMsg } from './to-pretty-errors-msg.js';
import { validateConnectionData } from './validate-connection-data.js';
import { Config } from '../shared/config/config.js';

export async function getConnectionToDbParams(): Promise<ICLIConnectionCredentials> {
  const connectionCredentials = Config.getConnectionConfig();
  const errors = validateConnectionData(connectionCredentials);
  if (errors.length > 0) {
    console.error(toPrettyErrorsMsg(errors));
    process.exit(0);
  }
  return connectionCredentials;
}
