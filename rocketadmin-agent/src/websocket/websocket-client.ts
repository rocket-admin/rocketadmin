import WebSocket from 'ws';
import chalk from 'chalk';
import ora from 'ora';
import { CommandExecutor } from '../command/command-executor.js';
import { OperationTypeEnum } from '../enums/operation-type.enum.js';
import { ICLIConnectionCredentials } from '../interfaces/interfaces.js';

export interface WebSocketClientOptions {
  serverUrl: string;
  connectionToken: string;
  connectionConfig: ICLIConnectionCredentials;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private readonly serverUrl: string;
  private readonly connectionToken: string;
  private readonly connectionConfig: ICLIConnectionCredentials;
  private readonly reconnectInterval: number;
  private readonly maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private isShuttingDown: boolean = false;
  private spinner: ReturnType<typeof ora> | null = null;

  constructor(options: WebSocketClientOptions) {
    this.serverUrl = options.serverUrl;
    this.connectionToken = options.connectionToken;
    this.connectionConfig = options.connectionConfig;
    this.reconnectInterval = options.reconnectInterval || 1000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || Infinity;
  }

  public connect(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.spinner = ora({
      text: 'Connecting to RocketAdmin server...',
      color: 'cyan',
    }).start();

    this.ws = new WebSocket(this.serverUrl);

    this.ws.on('open', this.handleOpen.bind(this));
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
  }

  public disconnect(): void {
    this.isShuttingDown = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleOpen(): void {
    this.reconnectAttempts = 0;

    if (this.spinner) {
      this.spinner.succeed(chalk.green('Connected to RocketAdmin server'));
    }

    const data = {
      operationType: 'initialConnection',
      connectionToken: this.connectionToken,
    };
    this.ws?.send(JSON.stringify(data));
    console.log(chalk.gray('→ Waiting for commands...'));
  }

  private async handleMessage(data: WebSocket.RawData): Promise<void> {
    try {
      const messageData = JSON.parse(data.toString());
      const {
        data: { resId },
      } = messageData;

      const commandExecutor = new CommandExecutor(this.connectionConfig);

      try {
        const result = await commandExecutor.executeCommand(messageData);
        const responseData = {
          operationType: OperationTypeEnum.dataFromAgent,
          commandResult: result,
          resId: resId,
        };
        this.ws?.send(JSON.stringify(responseData));
      } catch (e) {
        this.ws?.send(JSON.stringify(e));
      }
    } catch (e) {
      console.error(chalk.red('Failed to process message:'), e);
    }
  }

  private handleClose(code: number, reason: Buffer): void {
    if (this.isShuttingDown) {
      console.log(chalk.yellow('Disconnected from server'));
      return;
    }

    const reasonStr = reason.toString();
    console.log(chalk.yellow(`Connection closed${code ? ` (code: ${code})` : ''}${reasonStr ? `: ${reasonStr}` : ''}`));

    this.scheduleReconnect();
  }

  private handleError(error: Error): void {
    if (this.spinner) {
      this.spinner.fail(chalk.red(`Connection error: ${error.message}`));
    } else {
      console.error(chalk.red(`WebSocket error: ${error.message}`));
    }

    if (this.ws) {
      this.ws.close();
    }
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(chalk.red('Maximum reconnection attempts reached. Exiting...'));
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, 30000); // Max 30 seconds

    console.log(chalk.gray(`Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts})`));

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export function createWebSocketClient(
  connectionConfig: ICLIConnectionCredentials,
  serverUrl?: string,
): WebSocketClient {
  const wsUrl = serverUrl || process.env.REMOTE_WEBSOCKET_ADDRESS || 'wss://ws.rocketadmin.com:443/';

  if (!connectionConfig.token) {
    console.error(chalk.red('Connection token is missing'));
    process.exit(1);
  }

  const client = new WebSocketClient({
    serverUrl: wsUrl,
    connectionToken: connectionConfig.token,
    connectionConfig: connectionConfig,
  });

  process.on('SIGINT', () => {
    console.log(chalk.yellow('\nReceived SIGINT. Gracefully shutting down...'));
    client.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\nReceived SIGTERM. Gracefully shutting down...'));
    client.disconnect();
    process.exit(0);
  });

  return client;
}
