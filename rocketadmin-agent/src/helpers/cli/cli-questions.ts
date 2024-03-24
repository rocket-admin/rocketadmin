import readlineSync from 'readline-sync';
import { Messages } from '../../text/messages.js';
import { Constants } from '../constants/constants.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';

export class CLIQuestionUtility {
  public static askConnectionToken(): string {
    let connectionToken: string = null;
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      connectionToken = readlineSync.question(Messages.INTRO_MESSAGES.WELCOME_MESSAGE).trim();
      if (connectionToken === Constants.CLI_QUIT_COMMAND) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
        process.exit(0);
        break;
      }
      if (!connectionToken || connectionToken.length <= 0) {
        console.log(Messages.CONNECTION_TOKEN_MISSING);
      } else {
        return connectionToken;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
        process.exit(0);
      }
    }
  }

  public static askConnectionType(): ConnectionTypesEnum {
    console.log(Messages.INTRO_MESSAGES.CONNECTION_TYPE_MESSAGE);
    const connectionTypeList: Array<string> = ['PostgreSQL', 'MySQL', 'Oracle Database', 'Microsoft SQL Server'];
    const connectionTypeIndex = readlineSync.keyInSelect(connectionTypeList, '-> \n') + 1;
    switch (connectionTypeIndex) {
      case 1:
        console.log(`${connectionTypeList[connectionTypeIndex - 1]} selected.`);
        return ConnectionTypesEnum.postgres;
      case 2:
        console.log(`${connectionTypeList[connectionTypeIndex - 1]} selected.`);
        return ConnectionTypesEnum.mysql;
      case 3:
        console.log(`${connectionTypeList[connectionTypeIndex - 1]} selected.`);
        return ConnectionTypesEnum.oracledb;
      case 4:
        console.log(`${connectionTypeList[connectionTypeIndex - 1]} selected.`);
        return ConnectionTypesEnum.mssql;
      case 0:
        console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
        process.exit(0);
        break;
      default:
        console.log(Messages.CONNECTION_TYPE_INVALID);
        break;
    }
  }

  public static askConnectionHost(): string {
    let connectionHost: string = null;
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      connectionHost = readlineSync.question(Messages.INTRO_MESSAGES.CONNECTION_HOST_MESSAGE).trim();
      if (connectionHost === Constants.CLI_QUIT_COMMAND) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
        process.exit(0);
        break;
      }
      if (!connectionHost || connectionHost.length <= 0) {
        console.log(Messages.CONNECTION_HOST_INVALID);
      } else {
        return connectionHost;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askConnectionPort(): number {
    let connectionPort: number = null;
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      connectionPort = parseInt(readlineSync.question(Messages.INTRO_MESSAGES.CONNECTION_PORT_MESSAGE));
      if (connectionPort < 0 || connectionPort > 65535 || !connectionPort) {
        console.log(Messages.CONNECTION_PORT_INVALID);
      } else {
        return connectionPort;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askConnectionUserName(): string {
    let connectionUserName: string = null;
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      connectionUserName = readlineSync.question(Messages.INTRO_MESSAGES.CONNECTION_USERNAME_MESSAGE).trim();
      if (connectionUserName === Constants.CLI_QUIT_COMMAND) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
        process.exit(0);
        break;
      }
      if (!connectionUserName || connectionUserName.length <= 0) {
        console.log(Messages.CONNECTION_USERNAME_INVALID);
      } else {
        return connectionUserName;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askConnectionPassword(message = Messages.INTRO_MESSAGES.CONNECTION_PASSWORD_MESSAGE): string {
    let connectionPassword: string = null;
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      connectionPassword = readlineSync.question(message).trim();
      if (connectionPassword === Constants.CLI_QUIT_COMMAND) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
        process.exit(0);
        break;
      }
      if (!connectionPassword || connectionPassword.length <= 0) {
        console.log(Messages.CONNECTION_PASSWORD_INVALID);
      } else {
        return connectionPassword;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askConnectionDatabase(): string {
    let connectionDatabase: string = null;
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      connectionDatabase = readlineSync.question(Messages.INTRO_MESSAGES.CONNECTION_DATABASE_MESSAGE).trim();
      if (connectionDatabase === Constants.CLI_QUIT_COMMAND) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
        process.exit(0);
        break;
      }
      if (!connectionDatabase || connectionDatabase.length <= 0) {
        console.log(Messages.CONNECTION_DATABASE_INVALID);
      } else {
        return connectionDatabase;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askConnectionSchema(): string {
    const connectionSchema = readlineSync.question(Messages.INTRO_MESSAGES.CONNECTION_SCHEMA_MESSAGE).trim();
    if (connectionSchema === Constants.CLI_QUIT_COMMAND) {
      console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
      process.exit(0);
    }
    if (!connectionSchema || connectionSchema.length <= 0) {
      return null;
    } else {
      return connectionSchema;
    }
  }

  public static askConnectionSid(): string {
    const connectionSID = readlineSync.question(Messages.INTRO_MESSAGES.CONNECTION_SID_MESSAGE).trim();
    if (connectionSID === Constants.CLI_QUIT_COMMAND) {
      console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
      process.exit(0);
    }
    if (!connectionSID || connectionSID.length <= 0) {
      return null;
    } else {
      return connectionSID;
    }
  }

  public static askConnectionAzureEncryption(): boolean {
    const yesNoList: Array<string> = ['YES', 'NO'];
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      const optionIndex =
        readlineSync.keyInSelect(yesNoList, Messages.INTRO_MESSAGES.CONNECTION_AZURE_ENCRYPTION_MESSAGE) + 1;
      switch (optionIndex) {
        case 1:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return true;
        case 2:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return false;
        case 0:
          console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
          process.exit(0);
          break;
        default:
          break;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askConnectionSslOption(): boolean {
    const yesNoList: Array<string> = ['YES', 'NO'];
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      const optionIndex =
        readlineSync.keyInSelect(yesNoList, Messages.INTRO_MESSAGES.CONNECTION_SSL_OPTION_MESSAGE) + 1;
      switch (optionIndex) {
        case 1:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return true;
        case 2:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return false;
        case 0:
          console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
          process.exit(0);
          break;
        default:
          break;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askApplicationSaveConfig(): boolean {
    const yesNoList: Array<string> = ['YES', 'NO'];
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      const optionIndex =
        readlineSync.keyInSelect(yesNoList, Messages.INTRO_MESSAGES.APPLICATION_CONFIG_SAVE_MESSAGE) + 1;
      switch (optionIndex) {
        case 1:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return true;
        case 2:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return false;
        case 0:
          console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
          process.exit(0);
          break;
        default:
          break;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askApplicationEncryptConfigOption(): boolean {
    const yesNoList: Array<string> = ['YES', 'NO'];
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      const optionIndex =
        readlineSync.keyInSelect(yesNoList, Messages.INTRO_MESSAGES.APPLICATION_CONFIG_ENCRYPT_MESSAGE) + 1;
      switch (optionIndex) {
        case 1:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return true;
        case 2:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return false;
        case 0:
          console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
          process.exit(0);
          break;
        default:
          break;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askApplicationEncryptionPassword(): string {
    let encPassword: string = null;
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      encPassword = readlineSync.question(Messages.INTRO_MESSAGES.APPLICATION_CONFIG_ENCRYPT_PASSWORD_MESSAGE).trim();
      if (encPassword === Constants.CLI_QUIT_COMMAND) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
        process.exit(0);
        break;
      }
      if (!encPassword || encPassword.length <= 0) {
        console.log(Messages.APPLICATION_ENCRYPTION_PASSWORD_INVALID);
      } else {
        return encPassword;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }

  public static askApplicationSaveLogsOption(): boolean {
    const yesNoList: Array<string> = ['YES', 'NO'];
    for (let i = 0; i < Constants.CLI_ATTEMPTS_COUNT; i++) {
      const optionIndex = readlineSync.keyInSelect(yesNoList, Messages.INTRO_MESSAGES.APPLICATION_SAVE_LOGS_OPTION) + 1;
      switch (optionIndex) {
        case 1:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return true;
        case 2:
          console.log(Messages.INTRO_MESSAGES.YOU_CHOOSE(yesNoList[optionIndex - 1]));
          return false;
        case 0:
          console.log(Messages.INTRO_MESSAGES.APPLICATION_CLI_QUIT);
          process.exit(0);
          break;
        default:
          break;
      }
      if (i === 2) {
        console.log(Messages.INTRO_MESSAGES.APPLICATION_ATTEMPTS_QUIT);
      }
    }
  }
}
