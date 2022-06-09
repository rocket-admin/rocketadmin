import { ConnectionEntity } from '../../connection/connection.entity';
import { TableSettingForTestConnections } from '../../../helpers/constants/table-setting-for-test-connections';
import { Constants } from '../../../helpers/constants/constants';
import { CreateTableSettingsDto } from '../../table-settings/dto';
import { TableSettingsEntity } from '../../table-settings/table-settings.entity';

export function buildTestTableSettings(connections: Array<ConnectionEntity>): Array<Array<TableSettingsEntity>> {
  const testTablesSettingsEntities: Array<Array<TableSettingsEntity>> = [];
  for (const connection of connections) {
    let testSettings: Array<CreateTableSettingsDto> = null;
    let testSettingsEntities: Array<TableSettingsEntity> = [];
    switch (connection.host) {
      case Constants.TEST_CONNECTION_TO_POSTGRES.host:
        testSettings = TableSettingForTestConnections.getPostgresSettingsDTOs(connection.id);
        testSettingsEntities = tableSettingsDtosToTableSettingsEntity(testSettings, connection);
        testTablesSettingsEntities.push(testSettingsEntities);
        break;
      case Constants.TEST_SSH_CONNECTION_TO_MYSQL.host:
        testSettings = TableSettingForTestConnections.getMySQLTableSettingsDTOs(connection.id);
        testSettingsEntities = tableSettingsDtosToTableSettingsEntity(testSettings, connection);
        testTablesSettingsEntities.push(testSettingsEntities);
        break;
      case Constants.TEST_CONNECTION_TO_ORACLE.host:
        testSettings = TableSettingForTestConnections.getOracleSettingsDTOs(connection.id);
        testSettingsEntities = tableSettingsDtosToTableSettingsEntity(testSettings, connection);
        testTablesSettingsEntities.push(testSettingsEntities);
        break;
      case Constants.TEST_CONNECTION_TO_MSSQL.host:
        testSettings = TableSettingForTestConnections.getMsSQLSettingsDTOs(connection.id);
        testSettingsEntities = tableSettingsDtosToTableSettingsEntity(testSettings, connection);
        testTablesSettingsEntities.push(testSettingsEntities);
        break;
      default:
        testTablesSettingsEntities.push([]);
    }
  }
  return testTablesSettingsEntities;
}

function tableSettingsDtosToTableSettingsEntity(
  tableSettings: Array<CreateTableSettingsDto>,
  connection: ConnectionEntity,
): Array<TableSettingsEntity> {
  const tableSettingsEntities: Array<TableSettingsEntity> = [];
  for (const tableSetting of tableSettings) {
    const newSettings = new TableSettingsEntity();
    newSettings.connection_id = connection;
    newSettings.display_name = tableSetting.display_name;
    newSettings.table_name = tableSetting.table_name;
    newSettings.search_fields = tableSetting.search_fields;
    newSettings.excluded_fields = tableSetting.excluded_fields;
    newSettings.list_fields = tableSetting.list_fields;
    newSettings.list_per_page = tableSetting.list_per_page;
    newSettings.ordering = tableSetting.ordering;
    newSettings.ordering_field = tableSetting.ordering_field;
    newSettings.readonly_fields = tableSetting.readonly_fields;
    newSettings.sortable_by = tableSetting.sortable_by;
    newSettings.autocomplete_columns = tableSetting.autocomplete_columns;
    newSettings.custom_fields = tableSetting.custom_fields;
    newSettings.table_widgets = tableSetting.table_widgets;
    newSettings.identification_fields = tableSetting.identification_fields;
    newSettings.columns_view = tableSetting.columns_view;
    newSettings.identity_column = tableSetting.identity_column;
    tableSettingsEntities.push(newSettings);
  }
  return tableSettingsEntities;
}
