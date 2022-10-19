import { DataSource } from 'typeorm';
import { configService } from '../config/config.service';
let appDataSourceCache: DataSource = null;

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      if (appDataSourceCache && appDataSourceCache.isInitialized) {
        return appDataSourceCache;
      }
      const AppDataSource = new DataSource(configService.getTypeOrmConfig());
      const dataSource = await AppDataSource.initialize();
      appDataSourceCache = dataSource;
      return dataSource;
    },
  },
];
