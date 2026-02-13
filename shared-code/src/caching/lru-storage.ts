/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import { Client } from 'cassandra-driver';
import { Database } from 'ibm_db';
import { Knex } from 'knex';
import { LRUCache } from 'lru-cache';
import { MongoClientDB } from '../data-access-layer/data-access-objects/data-access-object-mongodb.js';
import {
	ConnectionAgentParams,
	ConnectionParams,
} from '../data-access-layer/shared/data-structures/connections-params.ds.js';
import { ForeignKeyDS } from '../data-access-layer/shared/data-structures/foreign-key.ds.js';
import { PrimaryKeyDS } from '../data-access-layer/shared/data-structures/primary-key.ds.js';
import { TableStructureDS } from '../data-access-layer/shared/data-structures/table-structure.ds.js';
import { CACHING_CONSTANTS } from './caching-constants.js';
const knexCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_CONNECTION_CACHE_OPTIONS);
const tunnelCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TUNNEL_CACHE_OPTIONS);
const imdbDb2Cache = new LRUCache(CACHING_CONSTANTS.DEFAULT_IMDB_DB2_CACHE_OPTIONS);
const mongoDbCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_MONGO_DB_CACHE_OPTIONS);
const cassandraClientCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_CASSANDRA_CLIENT_CACHE_OPTIONS);
const tableStructureCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tableForeignKeysCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const tablePrimaryKeysCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_TABLE_STRUCTURE_ELEMENTS_CACHE_OPTIONS);
const redisClientCache = new LRUCache(CACHING_CONSTANTS.DEFAULT_REDIS_CLIENT_CACHE_OPTIONS);
const schemaHashCache = new LRUCache<string, string>(CACHING_CONSTANTS.DEFAULT_SCHEMA_HASH_CACHE_OPTIONS);
export class LRUStorage {
	public static getRedisClientCache(connection: ConnectionParams): any | null {
		const cachedClient = redisClientCache.get(LRUStorage.getConnectionIdentifier(connection));
		return cachedClient ? cachedClient : null;
	}

	public static setRedisClientCache(connection: ConnectionParams, client: any): void {
		redisClientCache.set(LRUStorage.getConnectionIdentifier(connection), client);
	}

	public static delRedisClientCache(connection: ConnectionParams): void {
		redisClientCache.delete(LRUStorage.getConnectionIdentifier(connection));
	}

	public static setCassandraClientCache(connection: ConnectionParams, client: Client): void {
		cassandraClientCache.set(LRUStorage.getConnectionIdentifier(connection), client);
	}

	public static getCassandraClientCache(connection: ConnectionParams): Client | null {
		const cachedClient = cassandraClientCache.get(LRUStorage.getConnectionIdentifier(connection)) as Client;
		return cachedClient ? cachedClient : null;
	}

	public static delCassandraClientCache(connection: ConnectionParams): void {
		cassandraClientCache.delete(LRUStorage.getConnectionIdentifier(connection));
	}

	public static getCassandraClientCount(): number {
		return cassandraClientCache.size;
	}

	public static clearCassandraClientCache(): void {
		cassandraClientCache.clear();
	}

	public static setMongoDbCache(connection: ConnectionParams, newDb: MongoClientDB): void {
		mongoDbCache.set(LRUStorage.getConnectionIdentifier(connection), newDb);
	}

	public static getMongoDbCache(connection: ConnectionParams): MongoClientDB | null {
		const cachedDb = mongoDbCache.get(LRUStorage.getConnectionIdentifier(connection)) as MongoClientDB;
		return cachedDb ? cachedDb : null;
	}

	public static delMongoDbCache(connection: ConnectionParams): void {
		mongoDbCache.delete(LRUStorage.getConnectionIdentifier(connection));
	}

	public static getImdbDb2Cache(connection: ConnectionParams): Database | null {
		const cachedDb = imdbDb2Cache.get(LRUStorage.getConnectionIdentifier(connection)) as Database;
		return cachedDb ? cachedDb : null;
	}

	public static delImdbDb2Cache(connection: ConnectionParams): void {
		imdbDb2Cache.delete(LRUStorage.getConnectionIdentifier(connection));
	}

	public static setImdbDb2Cache(connection: ConnectionParams, newDb: Database): void {
		imdbDb2Cache.set(LRUStorage.getConnectionIdentifier(connection), newDb);
	}

	public static getCachedKnex(connectionConfig: ConnectionParams): Knex | null {
		const cachedKnex = knexCache.get(LRUStorage.getConnectionIdentifier(connectionConfig)) as Knex;
		return cachedKnex ? cachedKnex : null;
	}

	public static setKnexCache(connectionConfig: ConnectionParams, newKnex: Knex): void {
		knexCache.set(LRUStorage.getConnectionIdentifier(connectionConfig), newKnex);
	}

	public static delKnexCache(connectionConfig: ConnectionParams): void {
		knexCache.delete(LRUStorage.getConnectionIdentifier(connectionConfig));
	}

	public static getTunnelCache(connection: ConnectionParams): any {
		const cachedTnl = tunnelCache.get(LRUStorage.getConnectionIdentifier(connection));
		return cachedTnl ? cachedTnl : null;
	}

	public static setTunnelCache(connection: ConnectionParams, tnlObj: Record<string, unknown>): void {
		tunnelCache.set(LRUStorage.getConnectionIdentifier(connection), tnlObj);
	}

	public static delTunnelCache(connection: ConnectionParams): void {
		tunnelCache.delete(LRUStorage.getConnectionIdentifier(connection));
	}

	public static setTableForeignKeysCache(
		connection: ConnectionParams | ConnectionAgentParams,
		tableName: string,
		foreignKeys: Array<ForeignKeyDS>,
	): void {
		const connectionCopy = {
			...connection,
		};
		const cacheObj = JSON.stringify({ connectionCopy, tableName });
		tableForeignKeysCache.set(cacheObj, foreignKeys);
	}

	public static getTableForeignKeysCache(
		connection: ConnectionParams | ConnectionAgentParams,
		tableName: string,
	): Array<ForeignKeyDS> {
		const connectionCopy = {
			...connection,
		};
		const cacheObj = JSON.stringify({ connectionCopy, tableName });
		const foundKeys = tableForeignKeysCache.get(cacheObj) as Array<ForeignKeyDS>;
		return foundKeys ? foundKeys : null;
	}

	public static setTablePrimaryKeysCache(
		connection: ConnectionParams | ConnectionAgentParams,
		tableName: string,
		primaryKeys: Array<PrimaryKeyDS>,
	): void {
		const connectionCopy = {
			...connection,
		};
		const cacheObj = JSON.stringify({ connectionCopy, tableName });
		tablePrimaryKeysCache.set(cacheObj, primaryKeys);
	}

	public static getTablePrimaryKeysCache(
		connection: ConnectionParams | ConnectionAgentParams,
		tableName: string,
	): Array<PrimaryKeyDS> {
		const connectionCopy = {
			...connection,
		};
		const cacheObj = JSON.stringify({ connectionCopy, tableName });
		const foundKeys = tablePrimaryKeysCache.get(cacheObj) as Array<PrimaryKeyDS>;
		return foundKeys ? foundKeys : null;
	}

	public static getTableStructureCache(
		connection: ConnectionParams | ConnectionAgentParams,
		tableName: string,
	): Array<TableStructureDS> {
		const connectionCopy = {
			...connection,
		};
		const cacheObj = JSON.stringify({ connectionCopy, tableName });
		const foundStructure = tableStructureCache.get(cacheObj) as Array<TableStructureDS>;
		return foundStructure ? foundStructure : null;
	}

	public static setTableStructureCache(
		connection: ConnectionParams | ConnectionAgentParams,
		tableName: string,
		structure: Array<TableStructureDS>,
	): void {
		const connectionCopy = {
			...connection,
		};
		const cacheObj = JSON.stringify({ connectionCopy, tableName });
		tableStructureCache.set(cacheObj, structure);
	}

	public static getConnectionIdentifier(connectionParams: ConnectionParams | ConnectionAgentParams): string {
		if (LRUStorage.isConnectionAgentParams(connectionParams)) {
			const cacheObj = {
				id: connectionParams.id,
				token: connectionParams.token,
				signing_key: connectionParams.signing_key,
			};
			return JSON.stringify(cacheObj);
		}
		if (connectionParams.isTestConnection) {
			return connectionParams.host;
		}
		if (connectionParams.ssh) {
			const cacheObj = {
				id: connectionParams.id,
				signing_key: connectionParams.signing_key,
				type: connectionParams.type,
				username: connectionParams.username,
				database: connectionParams.database,
			};
			return JSON.stringify(cacheObj);
		}
		const cacheObj = {
			// id: connectionParams.id,
			// signing_key: connectionParams.signing_key,
			host: connectionParams.host,
			port: connectionParams.port,
			username: connectionParams.username,
			database: connectionParams.database,
			type: connectionParams.type,
			schema: connectionParams.schema ? connectionParams.schema : null,
			authSource: connectionParams.authSource ? connectionParams.authSource : null,
			sid: connectionParams.sid ? connectionParams.sid : null,
			dataCenter: connectionParams.dataCenter ? connectionParams.dataCenter : null,
		};
		return JSON.stringify(cacheObj);
	}

	public static isConnectionAgentParams(
		connectionParams: ConnectionParams | ConnectionAgentParams,
	): connectionParams is ConnectionAgentParams {
		if (Object.hasOwn(connectionParams, 'token') && (connectionParams as ConnectionAgentParams).token) {
			return true;
		}
		return false;
	}

	public static getSchemaHashCache(connection: ConnectionParams | ConnectionAgentParams): string | null {
		const connectionId = LRUStorage.getConnectionIdentifier(connection);
		const cachedHash = schemaHashCache.get(connectionId);
		return cachedHash ?? null;
	}

	public static setSchemaHashCache(connection: ConnectionParams | ConnectionAgentParams, hash: string): void {
		const connectionId = LRUStorage.getConnectionIdentifier(connection);
		schemaHashCache.set(connectionId, hash);
	}

	public static validateSchemaHashAndInvalidate(
		connection: ConnectionParams | ConnectionAgentParams,
		currentHash: string,
	): boolean {
		const cachedHash = LRUStorage.getSchemaHashCache(connection);
		if (cachedHash && cachedHash !== currentHash) {
			LRUStorage.invalidateConnectionTableMetadata(connection);
			LRUStorage.setSchemaHashCache(connection, currentHash);
			return false;
		}
		if (!cachedHash) {
			LRUStorage.setSchemaHashCache(connection, currentHash);
		}
		return true;
	}

	public static invalidateConnectionTableMetadata(connection: ConnectionParams | ConnectionAgentParams): void {
		const connectionCopy = { ...connection };
		const connectionStr = JSON.stringify({ connectionCopy });
		for (const key of tableStructureCache.keys()) {
			if (typeof key === 'string' && key.includes(connectionStr.slice(0, -1))) {
				tableStructureCache.delete(key);
			}
		}
		for (const key of tableForeignKeysCache.keys()) {
			if (typeof key === 'string' && key.includes(connectionStr.slice(0, -1))) {
				tableForeignKeysCache.delete(key);
			}
		}
		for (const key of tablePrimaryKeysCache.keys()) {
			if (typeof key === 'string' && key.includes(connectionStr.slice(0, -1))) {
				tablePrimaryKeysCache.delete(key);
			}
		}
	}
}
