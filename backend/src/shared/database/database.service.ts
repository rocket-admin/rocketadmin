import { Connection, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';

@Injectable()
export class DatabaseService {
  constructor(@InjectConnection() public connection: Connection) {}

  async getRepository<T>(entity): Promise<Repository<T>> {
    return this.connection.getRepository(entity);
  }
}
