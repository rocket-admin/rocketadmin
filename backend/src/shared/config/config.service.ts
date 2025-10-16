import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import path from 'path';
import { fileURLToPath } from 'url';
import parse from 'pg-connection-string';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { PGliteDriver } from 'typeorm-pglite';
import fs from 'fs';
import { isTest } from '../../helpers/app/is-test.js';

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
      console.info('Running test environment');
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
    const pgLiteFolderPath = process.env.PGLITE_FOLDER_PATH;

    let pgLiteDriver = null;
    let connectionParams = {};

    if (pgLiteFolderPath && pgLiteFolderPath.length > 0) {
      const fullPath = isTest()
        ? path.join(process.cwd(), ...pgLiteFolderPath.split('/'))
        : path.join(__dirname, '..', '..', '..', pgLiteFolderPath);
        
      const resolvedPath = path.resolve(fullPath);
      try {
        fs.accessSync(resolvedPath, fs.constants.F_OK);
        console.log('PGLite directory exists');
        try {
          fs.accessSync(resolvedPath, fs.constants.W_OK);
          console.log('PGLite directory is writable');
        } catch (writeError) {
          console.warn('PGLite directory exists but may not be writable:', writeError.message);
        }
      } catch (error) {
        console.log('PGLite directory does not exist, will be created by PGLite', error);
      }

      pgLiteDriver = new PGliteDriver({
        extensions: { uuid_ossp },
        dataDir: path.resolve(resolvedPath),
      }).driver;
    } else {
      connectionParams = this.parseTypeORMUrl(this.getValue('DATABASE_URL'));
    }

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
      driver: pgLiteDriver ? pgLiteDriver : undefined,
    };

    const newTypeOrmTestConfig: DataSourceOptions = {
      type: 'postgres',
      ...connectionParams,
      entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
      migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
      synchronize: false,
      migrationsRun: false,
      logging: false,
      extra: {
        max: 2,
      },
      logger: 'advanced-console',
      driver: pgLiteDriver ? pgLiteDriver : undefined,
    };

    return this.isTestEnvironment() ? newTypeOrmTestConfig : newTypeOrmProdConfig;
  }

  private parseTypeORMUrl(url: string): {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: any;
  } {
    const parsingResult = parse.parse(url);
    const { host, port, user, password, database, ssl } = parsingResult;

    return {
      host,
      port: parseInt(port),
      username: user,
      password,
      database,
      ssl,
    };
  }
}

const configService = new ConfigService(process.env).ensureValues([]);

export { configService };
