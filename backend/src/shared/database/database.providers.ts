import { DataSource } from 'typeorm';
import { BaseType } from '../../common/data-injection.tokens.js';
import { configService } from '../config/config.service.js';

let appDataSourceCache: DataSource = null;

export const databaseProviders = [
	{
		provide: BaseType.DATA_SOURCE,
		useFactory: async () => {
			if (appDataSourceCache?.isInitialized) {
				return appDataSourceCache;
			}
			const AppDataSource = new DataSource(configService.getTypeOrmConfig());
			const dataSource = await AppDataSource.initialize();
			appDataSourceCache = dataSource;
			return dataSource;
		},
	},
];
