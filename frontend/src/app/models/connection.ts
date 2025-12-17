import { AccessLevel } from "./user";

export enum DBtype {
    Postgres = 'postgres',
    MySQL = 'mysql',
    Oracle = 'oracledb',
    MSSQL = 'mssql',
    Mongo = 'mongodb',
    Dynamo = 'dynamodb',
    Cassandra = 'cassandra',
    Redis = 'redis',
    Elasticsearch = 'elasticsearch',
    DB2 = 'ibmdb2'
}

export enum ConnectionType {
    Agent = 'agent',
    Direct = 'direct'
}

export interface Connection {
    id: string | null,
    database: string,
    authSource?: string,
    title: string,
    host: string,
    port: string,
    sid: string | null,
    type: DBtype,
    createdAt?: Date,
    updatedAt?: Date,
    username: string
    password?:  string,
    ssh: boolean,
    privateSSHKey?: string,
    sshHost?: string,
    sshPort?: string,
    sshUsername?: string,
    ssl: boolean,
    cert: string,
    masterEncryption: boolean,
    azure_encryption: boolean,
    connectionType: ConnectionType,
    schema?: string,
    signing_key?: string,
    isTestConnection?: boolean,
    dataCenter?: string
}

export interface ConnectionItem {
    connection: Connection,
    accessLevel: AccessLevel
}

export interface TestConnection {
    result: boolean,
    message: string
}

export interface TableCategory {
    category_id: string,
    category_name: string,
    tables: string[],
    category_color?: string
}

export interface ConnectionSettings {
    hidden_tables?: string[],
    default_showing_table?: string,
    primary_color?: string,
    secondary_color?: string,
    logo_url?: string,
    company_name?: string,
    tables_audit?: boolean,
    table_categories?: TableCategory[]
}
