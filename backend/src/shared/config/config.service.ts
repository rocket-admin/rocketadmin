import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

class ConfigService {
  constructor(private env: { [k: string]: string | undefined }) {}

  private getValue(key: string, throwOnMissing = !this.isTestEnvironment()): string {
    // eslint-disable-next-line security/detect-object-injection
    const value = this.env[key];
    if (!value && throwOnMissing && key !== 'TYPEORM_PORT') {
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
    const newTypeOrmProdConfig: DataSourceOptions = {
      type: 'postgres',
      host: this.getValue('TYPEORM_HOST'),
      port: parseInt(this.getValue('TYPEORM_PORT', false)) || 5432,
      username: this.getValue('TYPEORM_USERNAME'),
      password: this.getValue('TYPEORM_PASSWORD'),
      database: this.getValue('TYPEORM_DATABASE'),
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
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'abc123',
      database: 'postgres',
      entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
      synchronize: false,
      migrationsRun: false,
      // maxQueryExecutionTime: 50,
      // ssl: this.isProduction(),
      logging: false,
      extra: {
        max: 4,
        // idle_in_transaction_session_timeout: 10*1000,
        //  idle_in_transaction_session_timeout: 1000,
      },
      logger: 'advanced-console',
    };

    return this.isTestEnvironment() ? newTypeOrmTestConfig : newTypeOrmProdConfig;
  }
}

const configService = new ConfigService(process.env).ensureValues([
  'TYPEORM_HOST',
  'TYPEORM_PORT',
  'TYPEORM_USERNAME',
  'TYPEORM_PASSWORD',
  'TYPEORM_DATABASE',
]);

export { configService };
