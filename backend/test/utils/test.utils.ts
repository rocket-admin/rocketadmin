/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../src/shared/database/database.service.js';

@Injectable()
// @ts-ignore
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
    jwt = jwt.replace('rocketadmin_cookie=', '');
    jwt = jwt.replace('; Path=/', '');
    return jwt;
  }

  async closeDbConnection() {
    try {
      this.databaseService.closeConnection();
    } catch (e) {
      console.log('close db connection error ->', e);
    }
  }

  async resetDb() {
    return;
    try {
      // const entities = await this.getEntities();
      await this.databaseService.dropDatabase();
      //await this.addMockEntities();
    } catch (e) {
      console.log('reset db error ->', e);
    }
  }

  private async cleanAll() {
    try {
      await this.databaseService.dropDatabase();
    } catch (error) {
      throw new Error(`ERROR: Cleaning test db: ${error}`);
    }
  }

  sleep(ms = 1000): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }

  // private async addMockEntities() {
  //   const newMockEntity = new MockEntity();
  //   newMockEntity.textField = faker.lorem.words(1);
  //   newMockEntity.booleanField = faker.datatype.boolean();
  //   newMockEntity.integerField = faker.datatype.number({ min: 5, max: 10, precision: 1 });
  //   const repository = await this.databaseService.getRepository('MockEntity');
  //   await repository.save(newMockEntity);
  // }
}
