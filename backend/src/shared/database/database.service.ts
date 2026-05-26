import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isTest } from '../../helpers/app/is-test.js';

export class DatabaseService {
	constructor(
		@InjectDataSource()
		private dataSource: DataSource,
	) {}

	public getDataSource(): DataSource {
		return this.dataSource;
	}

	public async dropDatabase() {
		if (!isTest()) {
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
			return await this.dataSource.destroy();
		} catch (e) {
			console.error(e);
		}
	}
}
