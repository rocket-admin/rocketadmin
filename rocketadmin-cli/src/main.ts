import WebSocket from 'ws';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { CommandExecutor } from './command/command-executor.js';
import { getConnectionToDbParams } from './helpers/get-connection-to-db-params.js';

import { OperationTypeEnum } from './enums/operation-type.enum.js';
import { Messages } from './text/messages.js';
import { checkConnection } from './helpers/check-connection.js';
import { ICLIConnectionCredentials } from './interfaces/interfaces.js';
import { Config } from './shared/config/config.js';
import { CLIQuestionUtility } from './helpers/cli/cli-questions.js';
import { ConnectionTypeEnum } from './enums/connection-type.enum.js';
import { mkDirIfNotExistsUtil } from './helpers/write-file-util.js';
import { Constants } from './helpers/constants/constants.js';

async function bootstrap() {
  const connectionCredentials: ICLIConnectionCredentials = Config.getConnectionConfig();
  await NestFactory.create(AppModule);
  function connect() {
    const ws = new WebSocket('wss://ws.autoadmin.org:443/');

    ws.on('open', function open() {
      const connectionToken = connectionCredentials?.token;
      if (!connectionToken) {
        console.error(Messages.CONNECTION_TOKEN_MISSING);
        process.exit(0);
      }
      console.log('-> Connected to the remote server');
      const data = {
        operationType: 'initialConnection',
        connectionToken: connectionToken,
      };
      ws.send(JSON.stringify(data));
    });

    ws.on('message', async function incoming(data: any) {
      const messageData = JSON.parse(data);
      const {
        data: { resId },
      } = messageData;
      const commandExecutor = new CommandExecutor(connection);
      try {
        const result = await commandExecutor.executeCommand(messageData);
        const responseData = {
          operationType: OperationTypeEnum.dataFromAgent,
          commandResult: result,
          resId: resId,
        };
        ws.send(JSON.stringify(responseData));
      } catch (e) {
        ws.send(JSON.stringify(e));
      }
    });

    ws.on('close', (code, reason) => {
      console.log(
        `${Messages.SOCKET_WAS_DISCONNECTED} ${code ? ` With code: ${code} ` : ' '}`,
        reason ? `Reason: ${reason}` : '',
      );
      setTimeout(() => {
        connect();
      }, 1000);
    });

    ws.on('error', (e) => {
      console.error(Messages.SOCKET_ENCOUNTERED_ERROR(e.message));
      ws.close();
    });
  }

  console.log('-> Application started');
  const connection = await getConnectionToDbParams();

  async function tryConnectToDatabase(timeout = 2000) {
    const checkConnectionResult = (await checkConnection(connection)).result;
    if (checkConnectionResult) {
      return;
    }
    let counter = 0;
    setTimeout(async function run() {
      timeout += 2000;
      ++counter;
      const tryResult = await checkConnection(connection);
      if (tryResult.result) {
        return;
      } else {
        if (counter >= 6) {
          console.log('-> Connection to database failed. Please check your credentials and network connection');
          process.exit(0);
          return;
        }
        setTimeout(run, timeout);
      }
    }, timeout);
  }

  await tryConnectToDatabase();

  connect();
}

(async function () {
  const connectionCredentials: ICLIConnectionCredentials = {
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
  };

  const savedConfig: ICLIConnectionCredentials = await Config.readConfigFromFile();
  if (savedConfig) {
    await Config.setConnectionConfig(savedConfig);
    bootstrap()
      .then(() => {
        console.info('-> Application launched');
      })
      .catch((e) => {
        console.error(`-> Failed to start application with error: ${e}`);
        process.exit(0);
      });
  } else {
    connectionCredentials.token = CLIQuestionUtility.askConnectionToken();
    connectionCredentials.type = CLIQuestionUtility.askConnectionType();
    if (connectionCredentials.type === ConnectionTypeEnum.oracledb) {
      console.log(Messages.INTRO_MESSAGES.ORACLE_INSTANT_CLIENT);
    }
    connectionCredentials.host = CLIQuestionUtility.askConnectionHost();
    connectionCredentials.port = CLIQuestionUtility.askConnectionPort();
    connectionCredentials.username = CLIQuestionUtility.askConnectionUserName();
    connectionCredentials.password = CLIQuestionUtility.askConnectionPassword();
    connectionCredentials.database = CLIQuestionUtility.askConnectionDatabase();
    connectionCredentials.schema = CLIQuestionUtility.askConnectionSchema();
    if (connectionCredentials.type === ConnectionTypeEnum.oracledb) {
      connectionCredentials.sid = CLIQuestionUtility.askConnectionSid();
    }
    if (connectionCredentials.type === ConnectionTypeEnum.mssql) {
      connectionCredentials.azure_encryption = CLIQuestionUtility.askConnectionAzureEncryption();
    }
    connectionCredentials.cert = null;
    connectionCredentials.ssl = CLIQuestionUtility.askConnectionSslOption();
    connectionCredentials.application_save_option = CLIQuestionUtility.askApplicationSaveConfig();
    if (connectionCredentials.application_save_option) {
      connectionCredentials.config_encryption_option = CLIQuestionUtility.askApplicationEncryptConfigOption();
    }
    if (connectionCredentials.config_encryption_option) {
      connectionCredentials.encryption_password = CLIQuestionUtility.askApplicationEncryptionPassword();
    }
    connectionCredentials.saving_logs_option = CLIQuestionUtility.askApplicationSaveLogsOption();
    if (connectionCredentials.saving_logs_option) {
      await mkDirIfNotExistsUtil(Constants.DEFAULT_LOGS_DIRNAME);
    }
    console.info(Messages.CREDENTIALS_ACCEPTED);

    await Config.setConnectionConfig(connectionCredentials, true);

    bootstrap()
      .then(() => {
        console.info('-> Application launched');
      })
      .catch((e) => {
        console.error(`-> Failed to start apllication with error: ${e}`);
        process.exit(0);
      });
  }
})();
