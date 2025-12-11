import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { ICLIConnectionCredentials } from '../../interfaces/interfaces.js';

const DATABASE_CHOICES = [
  { name: 'PostgreSQL', value: ConnectionTypesEnum.postgres },
  { name: 'MySQL', value: ConnectionTypesEnum.mysql },
  { name: 'Oracle Database', value: ConnectionTypesEnum.oracledb },
  { name: 'Microsoft SQL Server', value: ConnectionTypesEnum.mssql },
  { name: 'MongoDB', value: ConnectionTypesEnum.mongodb },
  { name: 'IBM Db2', value: ConnectionTypesEnum.ibmdb2 },
  { name: 'Redis', value: ConnectionTypesEnum.redis },
  { name: 'ClickHouse', value: ConnectionTypesEnum.clickhouse },
];

const DEFAULT_PORTS: Record<string, number> = {
  [ConnectionTypesEnum.postgres]: 5432,
  [ConnectionTypesEnum.mysql]: 3306,
  [ConnectionTypesEnum.oracledb]: 1521,
  [ConnectionTypesEnum.mssql]: 1433,
  [ConnectionTypesEnum.mongodb]: 27017,
  [ConnectionTypesEnum.ibmdb2]: 50000,
  [ConnectionTypesEnum.redis]: 6379,
  [ConnectionTypesEnum.clickhouse]: 8123,
};

export class InteractivePrompts {
  static displayWelcome(): void {
    console.log('');
    console.log(chalk.cyan('╔════════════════════════════════════════════════════════════════╗'));
    console.log(
      chalk.cyan('║') +
        chalk.white.bold('           RocketAdmin Agent Configuration Wizard            ') +
        chalk.cyan('║'),
    );
    console.log(chalk.cyan('╚════════════════════════════════════════════════════════════════╝'));
    console.log('');
    console.log(chalk.gray('This wizard will help you configure your database connection.'));
    console.log(chalk.gray('You can quit at any time by pressing Ctrl+C.'));
    console.log('');
  }

  static async askConnectionToken(): Promise<string> {
    const { token } = await inquirer.prompt([
      {
        type: 'input',
        name: 'token',
        message: chalk.cyan('Enter your connection token from RocketAdmin:'),
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return chalk.red('Connection token is required');
          }
          return true;
        },
      },
    ]);
    return token.trim();
  }

  static async askConnectionType(): Promise<ConnectionTypesEnum> {
    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: chalk.cyan('Select your database type:'),
        choices: DATABASE_CHOICES,
        pageSize: 10,
      },
    ]);
    console.log(chalk.green(`✓ Selected: ${DATABASE_CHOICES.find((c) => c.value === type)?.name}`));
    return type;
  }

  static async askConnectionHost(): Promise<string> {
    const { host } = await inquirer.prompt([
      {
        type: 'input',
        name: 'host',
        message: chalk.cyan('Enter database host:'),
        default: 'localhost',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return chalk.red('Host is required');
          }
          return true;
        },
      },
    ]);
    return host.trim();
  }

  static async askConnectionPort(dbType: ConnectionTypesEnum): Promise<number> {
    // eslint-disable-next-line security/detect-object-injection
    const defaultPort = DEFAULT_PORTS[dbType] || 5432;
    const { port } = await inquirer.prompt([
      {
        type: 'number',
        name: 'port',
        message: chalk.cyan('Enter database port:'),
        default: defaultPort,
        validate: (input: number) => {
          if (isNaN(input) || input < 1 || input > 65535) {
            return chalk.red('Port must be a number between 1 and 65535');
          }
          return true;
        },
      },
    ]);
    return port;
  }

  static async askConnectionUserName(): Promise<string> {
    const { username } = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: chalk.cyan('Enter database username:'),
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return chalk.red('Username is required');
          }
          return true;
        },
      },
    ]);
    return username.trim();
  }

  static async askConnectionPassword(message?: string): Promise<string> {
    const { password } = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message: message || chalk.cyan('Enter database password:'),
        mask: '*',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return chalk.red('Password is required');
          }
          return true;
        },
      },
    ]);
    return password.trim();
  }

  static async askConnectionDatabase(): Promise<string> {
    const { database } = await inquirer.prompt([
      {
        type: 'input',
        name: 'database',
        message: chalk.cyan('Enter database name:'),
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return chalk.red('Database name is required');
          }
          return true;
        },
      },
    ]);
    return database.trim();
  }

  static async askConnectionSchema(): Promise<string | null> {
    const { schema } = await inquirer.prompt([
      {
        type: 'input',
        name: 'schema',
        message: chalk.cyan('Enter schema name (optional, press Enter to skip):'),
      },
    ]);
    return schema.trim() || null;
  }

  static async askConnectionSid(): Promise<string | null> {
    const { sid } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sid',
        message: chalk.cyan('Enter Oracle SID (optional, press Enter to skip):'),
      },
    ]);
    return sid.trim() || null;
  }

  static async askConnectionAzureEncryption(): Promise<boolean> {
    const { azureEncryption } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'azureEncryption',
        message: chalk.cyan('Enable Azure encryption?'),
        default: false,
      },
    ]);
    return azureEncryption;
  }

  static async askConnectionSslOption(): Promise<boolean> {
    const { ssl } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ssl',
        message: chalk.cyan('Enable SSL connection?'),
        default: false,
      },
    ]);
    if (ssl) {
      console.log(
        chalk.yellow('⚠ Make sure to place your SSL certificate as "cert.pem" in the application directory'),
      );
    }
    return ssl;
  }

  static async askConnectionDataCenter(): Promise<string | null> {
    const { dataCenter } = await inquirer.prompt([
      {
        type: 'input',
        name: 'dataCenter',
        message: chalk.cyan('Enter Cassandra data center (optional, press Enter to skip):'),
      },
    ]);
    return dataCenter.trim() || null;
  }

  static async askConnectionAuthSource(): Promise<string | null> {
    const { authSource } = await inquirer.prompt([
      {
        type: 'input',
        name: 'authSource',
        message: chalk.cyan('Enter MongoDB auth source (optional, press Enter to skip):'),
        default: 'admin',
      },
    ]);
    return authSource.trim() || null;
  }

  static async askApplicationSaveConfig(): Promise<boolean> {
    const { save } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: chalk.cyan('Save configuration to file for future use?'),
        default: true,
      },
    ]);
    return save;
  }

  static async askApplicationEncryptConfigOption(): Promise<boolean> {
    const { encrypt } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'encrypt',
        message: chalk.cyan('Encrypt the saved configuration with a password?'),
        default: true,
      },
    ]);
    return encrypt;
  }

  static async askApplicationEncryptionPassword(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, confirmPassword } = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message: chalk.cyan('Enter encryption password:'),
        mask: '*',
        validate: (input: string) => {
          if (!input || input.length < 4) {
            return chalk.red('Password must be at least 4 characters');
          }
          return true;
        },
      },
      {
        type: 'password',
        name: 'confirmPassword',
        message: chalk.cyan('Confirm encryption password:'),
        mask: '*',
        validate: (input: string, answers: Record<string, string>) => {
          if (input !== answers.password) {
            return chalk.red('Passwords do not match');
          }
          return true;
        },
      },
    ]);
    return password;
  }

  static async askApplicationSaveLogsOption(): Promise<boolean> {
    const { saveLogs } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saveLogs',
        message: chalk.cyan('Save application logs to file?'),
        default: false,
      },
    ]);
    return saveLogs;
  }

  static async askDecryptionPassword(): Promise<string> {
    const { password } = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message: chalk.cyan('Enter your encryption password to decrypt configuration:'),
        mask: '*',
        validate: (input: string) => {
          if (!input || input.length === 0) {
            return chalk.red('Password is required');
          }
          return true;
        },
      },
    ]);
    return password;
  }

  static async runInteractiveSetup(): Promise<ICLIConnectionCredentials> {
    this.displayWelcome();

    const credentials: ICLIConnectionCredentials = {
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

    credentials.token = await this.askConnectionToken();
    credentials.type = await this.askConnectionType();
    credentials.host = await this.askConnectionHost();
    credentials.port = await this.askConnectionPort(credentials.type as ConnectionTypesEnum);

    if (credentials.type !== ConnectionTypesEnum.redis) {
      credentials.username = await this.askConnectionUserName();
    }
    credentials.password = await this.askConnectionPassword();

    if (credentials.type !== ConnectionTypesEnum.redis) {
      credentials.database = await this.askConnectionDatabase();
      credentials.schema = await this.askConnectionSchema();
    }

    if (credentials.type === ConnectionTypesEnum.oracledb) {
      credentials.sid = await this.askConnectionSid();
    }
    if (credentials.type === ConnectionTypesEnum.mssql) {
      credentials.azure_encryption = await this.askConnectionAzureEncryption();
    }
    if (credentials.type === ConnectionTypesEnum.cassandra) {
      credentials.dataCenter = await this.askConnectionDataCenter();
    }
    if (credentials.type === ConnectionTypesEnum.mongodb) {
      credentials.authSource = await this.askConnectionAuthSource();
    }

    credentials.ssl = await this.askConnectionSslOption();

    console.log('');
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.white.bold('  Configuration Storage Options'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');

    credentials.application_save_option = await this.askApplicationSaveConfig();

    if (credentials.application_save_option) {
      credentials.config_encryption_option = await this.askApplicationEncryptConfigOption();
      if (credentials.config_encryption_option) {
        credentials.encryption_password = await this.askApplicationEncryptionPassword();
      }
    }

    credentials.saving_logs_option = await this.askApplicationSaveLogsOption();

    console.log('');
    console.log(chalk.green('✓ Configuration complete!'));
    console.log('');

    return credentials;
  }

  static displayConfigSummary(config: ICLIConnectionCredentials): void {
    console.log('');
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.white.bold('  Connection Configuration'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(`  ${chalk.gray('Database Type:')} ${chalk.white(config.type)}`);
    console.log(`  ${chalk.gray('Host:')} ${chalk.white(config.host)}`);
    console.log(`  ${chalk.gray('Port:')} ${chalk.white(config.port)}`);
    if (config.username) {
      console.log(`  ${chalk.gray('Username:')} ${chalk.white(config.username)}`);
    }
    if (config.database) {
      console.log(`  ${chalk.gray('Database:')} ${chalk.white(config.database)}`);
    }
    if (config.schema) {
      console.log(`  ${chalk.gray('Schema:')} ${chalk.white(config.schema)}`);
    }
    console.log(`  ${chalk.gray('SSL:')} ${chalk.white(config.ssl ? 'Enabled' : 'Disabled')}`);
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
  }
}
