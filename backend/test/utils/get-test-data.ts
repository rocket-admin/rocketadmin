export function getTestData(mockFactory) {
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
  };
}
