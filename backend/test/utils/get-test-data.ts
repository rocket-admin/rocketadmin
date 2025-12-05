import { MockFactory } from '../mock.factory.js';

export function getTestData(mockFactory: MockFactory) {
  const newConnection = mockFactory.generateConnectionToTestPostgresDBInDocker();
  const newEncryptedConnection = mockFactory.generateCreateEncryptedInternalConnectionDto();
  const newConnection2 = mockFactory.generateCreateConnectionDto2();
  const newEncryptedConnection2 = mockFactory.generateCreateEncryptedConnectionDto();
  const newConnectionToTestDB = mockFactory.generateCreateConnectionDtoToTEstDB();
  const updateConnection = mockFactory.generateUpdateConnectionDto();
  const newGroup1 = mockFactory.generateCreateGroupDto1();
  const newConnectionInDocker = mockFactory.generateCreateInternalConnectionDto();
  const connectionToTestMSSQL = mockFactory.generateConnectionToTestMsSQlDBInDocker();
  const connectionToTestMSSQLSchemaInDocker = mockFactory.generateConnectionToTestSchemaMsSQlDBInDocker();
  const connectionToMySQL = mockFactory.generateConnectionToTestMySQLDBInDocker();
  const connectionToOracleDB = mockFactory.generateConnectionToTestOracleDBInDocker();
  const connectionToOracleDBSchema = mockFactory.generateConnectionToSchemaOracleDBInDocker();
  const encryptedPostgresConnection = mockFactory.generateEncryptedConnectionToTestPostgresDBInDocker();
  const connectionToPostgresSchema = mockFactory.generateConnectionToTestPostgresDBWithSchemaInDocker();
  const connectionToPostgres = mockFactory.generateConnectionToTestPostgresDBInDocker();
  const internalConnection = mockFactory.generateCreateConnectionDto();
  const postgresAgentConnection = mockFactory.generateConnectionToTestDbPostgresAgent();
  const oracleAgentConnection = mockFactory.generateConnectionToTestDbOracleAgent();
  const mysqlAgentConnection = mockFactory.generateConnectionToTestDbMysqlAgent();
  const mssqlAgentConnection = mockFactory.generateConnectionToTestDbMssqlAgent();
  const connectionToIbmDb2 = mockFactory.generateConnectionToTestDbIbmDb2();
  const connectionToAgentIbmDB2 = mockFactory.generateConnectionToTestDbIbmDb2Agent();
  const mongoDbConnection = mockFactory.generateConnectionToTestMongoDBInDocker();
  const mongoDbAgentConnection = mockFactory.generateConnectionToTestMongoDBAgent();
  const dynamoDBConnection = mockFactory.generateConnectionToTestDynamoDBInDocker();
  const elasticsearchTestConnection = mockFactory.generateConnectionToTestElasticsearchInDocker();
  const cassandraTestConnection = mockFactory.generateConnectionToTestCassandraInDocker();
  const cassandraAgentTestConnection = mockFactory.generateConnectionToTestCassandraAgent();
  const redisConnection = mockFactory.generateConnectionToTestRedisInDocker();
  const redisAgentConnection = mockFactory.generateConnectionToTestRedisAgent();
  const clickhouseTestConnection = mockFactory.generateConnectionToTestClickHouseDBInDocker();
  const clickhouseAgentTestConnection = mockFactory.generateConnectionToTestClickHouseAgent();
  return {
    newConnection,
    newEncryptedConnection,
    newConnection2,
    newEncryptedConnection2,
    newConnectionToTestDB,
    updateConnection,
    newGroup1,
    newConnectionInDocker,
    connectionToTestMSSQL,
    connectionToTestMSSQLSchemaInDocker,
    connectionToMySQL,
    connectionToOracleDB,
    connectionToOracleDBSchema,
    encryptedPostgresConnection,
    connectionToPostgresSchema,
    connectionToPostgres,
    internalConnection,
    postgresAgentConnection,
    oracleAgentConnection,
    mysqlAgentConnection,
    mssqlAgentConnection,
    connectionToIbmDb2,
    connectionToAgentIbmDB2,
    mongoDbConnection,
    mongoDbAgentConnection,
    dynamoDBConnection,
    elasticsearchTestConnection,
    cassandraTestConnection,
    cassandraAgentTestConnection,
    redisConnection,
    redisAgentConnection,
    clickhouseTestConnection,
    clickhouseAgentTestConnection
  };
}
