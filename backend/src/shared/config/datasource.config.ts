import { DataSource } from 'typeorm';
import { configService } from './config.service.js';

// Consumed only by the typeorm CLI (`migration:*` scripts), which calls `initialize()` itself.
// The typeorm >= 1.1.2 package rejects an overlapping second `initialize()` with
// CannotConnectAlreadyConnectedError. So the former fire-and-forget `datasource.initialize()` here
// made every `migration:run` fail.
const datasource = new DataSource(configService.getTypeOrmConfig());
export default datasource;
