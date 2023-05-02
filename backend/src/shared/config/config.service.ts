import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class ConfigService {
  constructor(private env: { [k: string]: string | undefined }) {}

  private getValue(key: string, throwOnMissing = !this.isTestEnvironment()): string {
    // eslint-disable-next-line security/detect-object-injection
    const value = this.env[key];
    if (!value && throwOnMissing) {
      throw new Error(`config error - missing env.${key}`);
    }

    return value;
  }

  public ensureValues(keys: Array<string>) {
    const isTest = this.isTestEnvironment();
    if (isTest) {
      console.log('Running test environment');
    }
    keys.forEach((k) => this.getValue(k, !isTest));
    return this;
  }

  public getPort() {
    return this.getValue('PORT', !this.isTestEnvironment());
  }

  public isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  public getTypeOrmConfig(): DataSourceOptions {
    const connectionParams = this.parseTypeORMUrl(this.getValue('DATABASE_URL'));
    const newTypeOrmProdConfig: DataSourceOptions = {
      type: 'postgres',
      ...connectionParams,
      entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
      synchronize: false,
      migrationsRun: false,
      extra: {
        max: 20,
        idle_in_transaction_session_timeout: 20 * 1000,
      },
    };

    const newTypeOrmTestConfig: DataSourceOptions = {
      type: 'postgres',
      ...connectionParams,
      entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
      synchronize: false,
      migrationsRun: false,
      // maxQueryExecutionTime: 50,
      // ssl: this.isProduction(),
      logging: false,
      extra: {
        max: 2,
        // idle_in_transaction_session_timeout: 10*1000,
        //  idle_in_transaction_session_timeout: 1000,
      },
      logger: 'advanced-console',
    };

    return this.isTestEnvironment() ? newTypeOrmTestConfig : newTypeOrmProdConfig;
  }

  private parseTypeORMUrl(url: string): {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  } {
    const match = url.match(/^postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
    if (!match) {
      throw new Error('Invalid Database URL');
    }
    const [, username, password, host, portStr, database] = match;
    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
      throw new Error('Invalid port number in Database URL');
    }
    return { host, port, username, password, database };
  }
}

const configService = new ConfigService(process.env).ensureValues(['DATABASE_URL']);

export { configService };
