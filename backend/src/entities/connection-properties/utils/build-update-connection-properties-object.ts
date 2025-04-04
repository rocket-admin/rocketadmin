import { CreateConnectionPropertiesDs } from '../application/data-structures/create-connection-properties.ds.js';

export function buildUpdateConnectionPropertiesObject(
  inputData: CreateConnectionPropertiesDs,
): IUpdateConnectionPropertiesObject {
  const {
    hidden_tables,
    logo_url,
    primary_color,
    secondary_color,
    hostname,
    company_name,
    tables_audit,
    human_readable_table_names,
    allow_ai_requests,
    default_showing_table,
  } = inputData;
  return {
    hidden_tables: hidden_tables,
    logo_url: logo_url,
    primary_color: primary_color,
    secondary_color: secondary_color,
    hostname: hostname,
    company_name: company_name,
    tables_audit: tables_audit,
    human_readable_table_names: human_readable_table_names,
    allow_ai_requests: allow_ai_requests,
    default_showing_table: default_showing_table,
  };
}

export interface IUpdateConnectionPropertiesObject {
  hidden_tables: Array<string>;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  hostname: string;
  company_name: string;
  tables_audit: boolean;
  human_readable_table_names: boolean;
  allow_ai_requests: boolean;
  default_showing_table: string;
}
