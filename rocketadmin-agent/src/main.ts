#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/shared/enums/connection-types-enum.js';
import { checkConnection } from './helpers/check-connection.js';
import { Constants } from './helpers/constants/constants.js';
import { InteractivePrompts } from './helpers/cli/interactive-prompts.js';
import { mkDirIfNotExistsUtil } from './helpers/write-file-util.js';
import { ICLIConnectionCredentials } from './interfaces/interfaces.js';
import { Config } from './shared/config/config.js';
import { createWebSocketClient } from './websocket/websocket-client.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let version = '0.0.1';
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
  version = packageJson.version;
} catch {}

const program = new Command();

program
  .name('rocketadmin-agent')
  .description('RocketAdmin Agent - Connect your database to RocketAdmin through a secure agent')
  .version(version)
  .option('-t, --token <token>', 'Connection token from RocketAdmin')
  .option('--type <type>', 'Database type (postgres, mysql, oracledb, mssql, mongodb, ibmdb2, redis, clickhouse)')
  .option('-H, --host <host>', 'Database host')
  .option('-p, --port <port>', 'Database port', parseInt)
  .option('-u, --username <username>', 'Database username')
  .option('-P, --password <password>', 'Database password')
  .option('-d, --database <database>', 'Database name')
  .option('-s, --schema <schema>', 'Database schema')
  .option('--sid <sid>', 'Oracle SID')
  .option('--ssl', 'Enable SSL connection', false)
  .option('--azure-encryption', 'Enable Azure encryption (MSSQL)', false)
  .option('--data-center <dataCenter>', 'Cassandra data center')
  .option('--auth-source <authSource>', 'MongoDB auth source')
  .option('--ws-url <url>', 'WebSocket server URL (overrides REMOTE_WEBSOCKET_ADDRESS env)')
  .option('--save-config', 'Save configuration to file', false)
  .option('--encrypt-config', 'Encrypt saved configuration', false)
  .option('--encryption-password <password>', 'Password for config encryption')
  .option('--save-logs', 'Save logs to file', false)
  .option('-i, --interactive', 'Run interactive configuration wizard', false);

async function testDatabaseConnection(connection: ICLIConnectionCredentials, maxRetries: number = 6): Promise<boolean> {
  const spinner = ora({
    text: 'Testing database connection...',
    color: 'cyan',
  }).start();

  const testResult = await checkConnection(connection);
  if (testResult.result) {
    spinner.succeed(chalk.green('Database connection successful'));
    return true;
  }

  spinner.warn(chalk.yellow('Initial connection failed, retrying...'));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const delay = 2000 + attempt * 2000;
    console.log(chalk.gray(`  Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`));

    await new Promise((resolve) => setTimeout(resolve, delay));

    const retryResult = await checkConnection(connection);
    if (retryResult.result) {
      console.log(chalk.green(`✓ Database connection successful on retry ${attempt}`));
      return true;
    }
  }

  console.error(chalk.red('✗ Database connection failed after all retries'));
  console.error(chalk.red('  Please check your credentials and network connection'));
  return false;
}

function buildCredentialsFromOptions(options: Record<string, any>): ICLIConnectionCredentials | null {
  if (!options.token || !options.type || !options.host || !options.port) {
    return null;
  }

  const validTypes = Object.values(ConnectionTypesEnum);
  if (!validTypes.includes(options.type as ConnectionTypesEnum)) {
    console.error(chalk.red(`Invalid database type: ${options.type}`));
    console.error(chalk.gray(`Valid types: ${validTypes.join(', ')}`));
    process.exit(1);
  }

  return {
    token: options.token,
    type: options.type,
    host: options.host,
    port: options.port,
    username: options.username || null,
    password: options.password || null,
    database: options.database || null,
    schema: options.schema || null,
    sid: options.sid || null,
    ssl: options.ssl || false,
    cert: null,
    app_port: 3000,
    azure_encryption: options.azureEncryption || false,
    application_save_option: options.saveConfig || false,
    config_encryption_option: options.encryptConfig || false,
    encryption_password: options.encryptionPassword || null,
    saving_logs_option: options.saveLogs || false,
    dataCenter: options.dataCenter || null,
    authSource: options.authSource || null,
  };
}

async function startAgent(config: ICLIConnectionCredentials, wsUrl?: string): Promise<void> {
  console.log('');
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.white.bold('  RocketAdmin Agent Starting'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  InteractivePrompts.displayConfigSummary(config);

  const connected = await testDatabaseConnection(config);
  if (!connected) {
    process.exit(1);
  }

  if (config.saving_logs_option) {
    await mkDirIfNotExistsUtil(Constants.DEFAULT_LOGS_DIRNAME);
    console.log(chalk.gray('→ Logs will be saved to', Constants.DEFAULT_LOGS_DIRNAME));
  }

  const client = createWebSocketClient(config, wsUrl);
  client.connect();

  console.log('');
  console.log(chalk.green('Agent is running. Press Ctrl+C to stop.'));
}

function getWebSocketUrl(cliOption?: string): string {
  const defaultUrl = 'wss://ws.rocketadmin.com:443/';
  const wsUrl = cliOption || process.env.REMOTE_WEBSOCKET_ADDRESS || defaultUrl;
  console.log(chalk.gray(`→ WebSocket URL: ${wsUrl}`));
  console.log(chalk.gray(`  (env REMOTE_WEBSOCKET_ADDRESS: ${process.env.REMOTE_WEBSOCKET_ADDRESS || 'not set'})`));
  return wsUrl;
}

async function main(): Promise<void> {
  program.parse();
  const options = program.opts();
  const wsUrl = getWebSocketUrl(options.wsUrl);

  try {
    const envConfig = Config.readConnectionConfigFromEnv();
    if (envConfig) {
      console.log(chalk.green('→ Configuration loaded from environment variables'));
      await Config.setConnectionConfig(envConfig);
      await startAgent(envConfig, wsUrl);
      return;
    }

    const cliConfig = buildCredentialsFromOptions(options);
    if (cliConfig && !options.interactive) {
      console.log(chalk.green('→ Configuration loaded from command line arguments'));
      await Config.setConnectionConfig(cliConfig, cliConfig.application_save_option);
      await startAgent(cliConfig, wsUrl);
      return;
    }

    const savedConfig = await Config.readConfigFromFile();
    if (savedConfig && !options.interactive) {
      console.log(chalk.green('→ Configuration loaded from saved file'));
      await Config.setConnectionConfig(savedConfig);
      await startAgent(savedConfig, wsUrl);
      return;
    }

    console.log(chalk.gray('No existing configuration found. Starting interactive setup...'));
    const interactiveConfig = await InteractivePrompts.runInteractiveSetup();

    if (interactiveConfig.saving_logs_option) {
      await mkDirIfNotExistsUtil(Constants.DEFAULT_LOGS_DIRNAME);
    }

    await Config.setConnectionConfig(interactiveConfig, true);
    await startAgent(interactiveConfig, wsUrl);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
      console.log(chalk.yellow('\nSetup cancelled.'));
      process.exit(0);
    }
    console.error(chalk.red('Failed to start agent:'), error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
