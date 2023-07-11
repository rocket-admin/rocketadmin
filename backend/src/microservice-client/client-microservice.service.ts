import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class ClientMicroservice {
  private readonly client: ClientProxy;
  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: process.env.MICROSERVICE_HOST || 'localhost',
        port: 3001,
      },
    });
  }

  public async sendMessageToMicroservice(pattern: any, data: string): Promise<unknown> {
    return this.client
      .send(pattern, data)
      .toPromise()
      .catch((e) => {
        console.log('🚀 ~ sendMessageToMicroservice error', e);
      });
  }

  public async closeClient(): Promise<void> {
    await this.client.close();
  }

  public async connectClient(): Promise<void> {
    await this.client.connect();
  }
}
