import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export class DatabaseService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  public getDataSource(): DataSource {
    return this.dataSource;
  }

  public async dropDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('This method only for testing');
    }
    try {
      await this.dataSource.dropDatabase();
      await this.dataSource.synchronize();
    } catch (e) {
      console.error(e);
    }
    return;
  }

  public async closeConnection() {
    try {
      return;
    } catch (e) {
      console.error(e);
    }
  }
}
