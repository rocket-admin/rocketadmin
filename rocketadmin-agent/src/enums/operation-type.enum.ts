export enum OperationTypeEnum {
  addRowInTable = 'addRowInTable',
  deleteRowInTable = 'deleteRowInTable',
  getRowByPrimaryKey = 'getRowByPrimaryKey',
  getRowsFromTable = 'getRowsFromTable',
  getTableForeignKeys = 'getTableForeignKeys',
  getTablePrimaryColumns = 'getTablePrimaryColumns',
  getTableStructure = 'getTableStructure',
  getTablesFromDB = 'getTablesFromDB',
  testConnect = 'testConnect',
  updateRowInTable = 'updateRowInTable',
  bulkUpdateRowsInTable = 'bulkUpdateRowsInTable',
  validateSettings = 'validateSettings',
  initialConnection = 'initialConnection',
  dataFromAgent = 'dataFromAgent',
  getIdentityColumns = 'getIdentityColumns',
  getReferencedTableNamesAndColumns = 'getReferencedTableNamesAndColumns',
  isView = 'isView',
  getRowsAsStream = 'getRowsAsStream',
  executeRawQuery = 'executeRawQuery',
}
