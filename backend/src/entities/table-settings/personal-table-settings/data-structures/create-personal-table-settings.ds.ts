import { QueryOrderingEnum } from '../../../../enums/query-ordering.enum.js';

export type PersonalTableSettingsMetadata = {
  connection_id: string;
  table_name: string;
  user_id: string;
  master_password: string;
};

export type PersonalTableSettingsData = {
  ordering: QueryOrderingEnum | null;
  ordering_field: string | null;
  list_per_page: number | null;
  columns_view: Array<string> | null;
  list_fields: Array<string> | null;
  original_names: boolean | null;
};

export class CreatePersonalTableSettingsDs {
  table_settings_metadata: PersonalTableSettingsMetadata;
  table_settings_data: PersonalTableSettingsData;
}
