import { DataSource } from 'typeorm';
import { configService } from './config.service.js';

// Consumed only by the typeorm CLI (`migration:*` scripts), which calls `initialize()` itself.
// typeorm >= 1.1.2 rejects an overlapping second `initialize()` with CannotConnectAlreadyConnectedError,
// so the former fire-and-forget `datasource.initialize()` here made every `migration:run` fail.
const datasource = new DataSource(configService.getTypeOrmConfig());
export default datasource;
