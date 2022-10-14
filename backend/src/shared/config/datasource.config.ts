import { DataSource } from 'typeorm';
import { configService } from './config.service';

const datasource = new DataSource(configService.getTypeOrmConfig());
datasource.initialize();
export default datasource;
