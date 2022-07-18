import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../src/shared/database/database.service';
import { MockEntity } from '../mocks/entities/mock.entity';
import * as faker from 'faker';

@Injectable()
export class TestUtils {
  databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('ERROR-TEST-UTILS-ONLY-FOR-TESTS');
    }
    this.databaseService = databaseService;
  }

  async shutdownServer(server) {
    try {
      await server.httpServer.close();
      await this.closeDbConnection();
    } catch (e) {
      console.log('shutdown server error ->', e);
    }
  }

  static getJwtTokenFromResponse(res: any): string {
    let jwt: string = res.headers['set-cookie'][0];
    jwt = jwt.replace('jwt=', '');
    jwt = jwt.replace('; Path=/', '');
    return jwt;
  }

  async closeDbConnection() {
    try {
      const connection = await this.databaseService.connection;
      if (connection.isConnected) {
        await (await this.databaseService.connection).close();
      }
    } catch (e) {
      console.log('close db connection error ->', e);
    }
  }

  private async getEntities() {
    try {
      const entities = [];
      (await this.databaseService.connection).entityMetadatas.forEach((x) =>
        entities.push({ name: x.name, tableName: x.tableName }),
      );
      return entities;
    } catch (e) {
      console.log('get entities error ->', e);
    }
  }

  async resetDb() {
    try {
      // const entities = await this.getEntities();
      await this.cleanAll();
      //await this.addMockEntities();
    } catch (e) {
      console.log('reset db error ->', e);
    }
  }

  private async cleanAll() {
    try {
      const connection = await this.databaseService.connection;
      await connection.synchronize(true);
    } catch (error) {
      throw new Error(`ERROR: Cleaning test db: ${error}`);
    }
  }

  private async addMockEntities() {
    const newMockEntity = new MockEntity();
    newMockEntity.textField = faker.random.word(1);
    newMockEntity.booleanField = faker.random.boolean();
    newMockEntity.integerField = faker.random.number({ min: 5, max: 10 });
    const repository = await this.databaseService.getRepository('MockEntity');
    await repository.save(newMockEntity);
  }
}
