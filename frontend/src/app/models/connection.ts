import { AccessLevel } from "./user";

export enum DBtype {
    Postgres = 'postgres',
    MySQL = 'mysql',
    Oracle = 'oracledb',
    MSSQL = 'mssql'
}

export enum ConnectionType {
    Agent = 'agent',
    Direct = 'direct'
}

export interface Connection {
    id: string | null,
    database: string,
​​    title: string,
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
    signing_key: string,
    isTestConnection?: boolean
}

export interface ConnectionItem {
    connection: Connection,
    accessLevel: AccessLevel
}

export interface TestConnection {
    result: boolean,
    message: string
}