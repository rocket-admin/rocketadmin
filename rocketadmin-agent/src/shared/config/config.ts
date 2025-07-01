import { ICLIConnectionCredentials, ISavedCLIConnectionCredentials } from '../../interfaces/interfaces.js';
import { writeFileUtil } from '../../helpers/write-file-util.js';
import { readFileUtil } from '../../helpers/read-file-util.js';
import { writeFileIfNotExistsUtil } from '../../helpers/write-file-util.js';
import { validateConnectionData } from '../../helpers/validate-connection-data.js';
import { toPrettyErrorsMsg } from '../../helpers/to-pretty-errors-msg.js';
import { Encryptor } from '../../helpers/encryption/encryptor.js';
import { CLIQuestionUtility } from '../../helpers/cli/cli-questions.js';
import { Constants } from '../../helpers/constants/constants.js';
import { Messages } from '../../text/messages.js';

const applicationConfigFileName = process.env.APPLICATION_CONFIG_FILE_NAME || '.autoadmin-config.txt';
const connectionConfig: ICLIConnectionCredentials = {
  app_port: 3000,
  azure_encryption: false,
  cert: null,
  database: null,
  host: null,
  password: null,
  port: null,
  schema: null,
  sid: null,
  ssl: false,
  token: null,
  type: null,
  username: null,
  application_save_option: false,
  config_encryption_option: false,
  encryption_password: null,
  saving_logs_option: false,
  dataCenter: null,
  authSource: null,
};

export class Config {
  public static async setConnectionConfig(config: ICLIConnectionCredentials, rewrite = false): Promise<void> {
    connectionConfig.type = config.type;
    connectionConfig.host = config.host;
    connectionConfig.port = config.port;
    connectionConfig.username = config.username;
    connectionConfig.password = config.password;
    connectionConfig.database = config.database;
    connectionConfig.schema = config.schema;
    connectionConfig.sid = config.sid;
    connectionConfig.ssl = config.ssl;
    connectionConfig.token = config.token;
    connectionConfig.app_port = config.app_port;
    connectionConfig.azure_encryption = config.azure_encryption;
    connectionConfig.config_encryption_option = config.config_encryption_option;
    connectionConfig.saving_logs_option = config.saving_logs_option;
    connectionConfig.dataCenter = config.dataCenter;

    if (config.ssl && rewrite) {
      try {
        connectionConfig.cert = await this.readSslSertificate();
        console.log('-> SSL certificate loaded from file');
      } catch (e) {
        console.log('-> Failed to load SSL certificate' + e);
        process.exit(0);
      }
    }

    if (config.application_save_option) {
      if (config.config_encryption_option && config.encryption_password) {
        const password = config.encryption_password;
        delete config.encryption_password;
        const savedCredentials: ISavedCLIConnectionCredentials = {
          encrypted: true,
          hash: await Encryptor.hashPassword(password),
          credentials: Encryptor.encryptDataMasterPwd(JSON.stringify(config), password),
        };
        try {
          if (rewrite) {
            await writeFileUtil(applicationConfigFileName, JSON.stringify(savedCredentials));
            console.log('Configuration file saved');
          } else {
            await writeFileIfNotExistsUtil(applicationConfigFileName, JSON.stringify(savedCredentials));
            console.log('Configuration file saved');
          }
        } catch (e) {
          console.error('Failed to save application config: ' + e.message);
        }
      } else {
        const savedCredentials: ISavedCLIConnectionCredentials = {
          encrypted: false,
          hash: null,
          credentials: config,
        };
        try {
          if (rewrite) {
            await writeFileUtil(applicationConfigFileName, JSON.stringify(savedCredentials));
            console.log('Configuration file saved');
          } else {
            await writeFileIfNotExistsUtil(applicationConfigFileName, JSON.stringify(savedCredentials));
            console.log('Configuration file saved');
          }
        } catch (e) {
          console.error('Failed to save application config: ' + e.message);
        }
      }
    }
  }

  public static getConnectionConfig(): ICLIConnectionCredentials {
    return connectionConfig;
  }

  public static async readConfigFromFile(): Promise<ICLIConnectionCredentials | null> {
    console.log('-> Try to read configuration file');
    try {
      const file = await readFileUtil(applicationConfigFileName);

      if (file) {
        const appConfig: ISavedCLIConnectionCredentials = JSON.parse(file);
        if (appConfig.encrypted) {
          let encryptionPassword = null;
          for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
            encryptionPassword = CLIQuestionUtility.askConnectionPassword(
              Messages.INTRO_MESSAGES.ASK_ENCRYPTION_PASSWORD_MESSAGE,
            );
            if (!(await Encryptor.verifyPassword(appConfig.hash, encryptionPassword))) {
              console.log(Messages.CORRUPTED_DATA_OR_PASSWORD);
              if (i === 2) {
                console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
                process.exit(0);
              }
            } else {
              break;
            }
          }
          try {
            const decryptedCredentials: string = Encryptor.decryptDataMasterPwd(
              appConfig.credentials as string,
              encryptionPassword,
            );
            const decryptedCredentialsObj: ICLIConnectionCredentials = JSON.parse(decryptedCredentials);
            const errors = validateConnectionData(decryptedCredentialsObj);
            if (errors.length > 0) {
              console.error(
                `Saved connection options are corrupted. Please renew it. Found errors: ` + toPrettyErrorsMsg(errors),
              );
              process.exit(0);
            }
            console.log('-> Configuration loaded from file');
            return decryptedCredentialsObj;
          } catch (_e) {
            console.log(Messages.CORRUPTED_DATA_OR_PASSWORD);
            process.exit(0);
          }
        } else {
          try {
            const decryptedCredentials: ICLIConnectionCredentials = appConfig.credentials as ICLIConnectionCredentials;
            const errors = validateConnectionData(decryptedCredentials);
            if (errors.length > 0) {
              console.error(
                `Saved connection options are corrupted. Please renew it. Found errors: ` + toPrettyErrorsMsg(errors),
              );
              process.exit(0);
            }
            console.log('-> Configuration loaded from file');
            return decryptedCredentials;
          } catch (_e) {
            console.log(Messages.CORRUPTED_DATA);
            process.exit(0);
          }
        }
      }
    } catch (_e) {
      console.log('-> Failed to load configuration from file');
      return null;
    }
  }

  public static readConnectionConfigFromEnv(): ICLIConnectionCredentials {
    const connectionConfig: ICLIConnectionCredentials = {
      type: process.env.CONNECTION_TYPE,
      host: process.env.CONNECTION_HOST,
      port: parseInt(process.env.CONNECTION_PORT, 10),
      username: process.env.CONNECTION_USERNAME,
      password: process.env.CONNECTION_PASSWORD,
      database: process.env.CONNECTION_DATABASE,
      schema: process.env.CONNECTION_SCHEMA,
      sid: process.env.CONNECTION_SID,
      ssl: process.env.CONNECTION_SSL === '1',
      cert: process.env.CONNECTION_SSL_SERTIFICATE,
      token: process.env.CONNECTION_TOKEN,
      app_port: parseInt(process.env.APP_PORT) || 3000,
      azure_encryption: process.env.CONNECTION_AZURE_ENCRYPTION === '1',
      application_save_option: false,
      config_encryption_option: false,
      encryption_password: null,
      saving_logs_option: process.env.LOGS_TO_TEXT_FILE === '1',
      dataCenter: process.env.CONNECTION_DATA_CENTER || null,
      authSource: process.env.CONNECTION_AUTH_SOURCE || null,
    };

    const errors = validateConnectionData(connectionConfig);
    if (errors.length > 0) {
      console.error(`-> Environment configuration not found.`);
      return null;
    }
    console.log('-> Configuration loaded from environment variables');

    return connectionConfig;
  }

  private static async readSslSertificate(): Promise<string> {
    return await readFileUtil('cert.pem');
  }
}
