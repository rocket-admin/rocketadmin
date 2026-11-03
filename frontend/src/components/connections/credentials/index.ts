// The credentials form of each database type (connect-db's `credentialsFormMap`).
import type { Component } from 'vue';
import { DBtype } from '@/models/connection';
import CassandraCredentialsForm from './CassandraCredentialsForm.vue';
import ClickhouseCredentialsForm from './ClickhouseCredentialsForm.vue';
import DynamodbCredentialsForm from './DynamodbCredentialsForm.vue';
import ElasticCredentialsForm from './ElasticCredentialsForm.vue';
import MongodbCredentialsForm from './MongodbCredentialsForm.vue';
import MssqlCredentialsForm from './MssqlCredentialsForm.vue';
import MysqlCredentialsForm from './MysqlCredentialsForm.vue';
import OracledbCredentialsForm from './OracledbCredentialsForm.vue';
import PostgresCredentialsForm from './PostgresCredentialsForm.vue';
import RedisCredentialsForm from './RedisCredentialsForm.vue';

export const CREDENTIALS_FORMS: Record<DBtype, Component> = {
	[DBtype.MySQL]: MysqlCredentialsForm,
	[DBtype.Postgres]: PostgresCredentialsForm,
	[DBtype.Mongo]: MongodbCredentialsForm,
	[DBtype.Dynamo]: DynamodbCredentialsForm,
	[DBtype.Cassandra]: CassandraCredentialsForm,
	[DBtype.Oracle]: OracledbCredentialsForm,
	[DBtype.MSSQL]: MssqlCredentialsForm,
	[DBtype.Redis]: RedisCredentialsForm,
	[DBtype.Elasticsearch]: ElasticCredentialsForm,
	[DBtype.ClickHouse]: ClickhouseCredentialsForm,
};

export type { CredentialsFormEmits, CredentialsFormProps } from './credentialsForm';
