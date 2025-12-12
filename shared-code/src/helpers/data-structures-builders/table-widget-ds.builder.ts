import { TableWidgetDS } from '../../data-access-layer/shared/data-structures/table-widget.ds.js';
import { IUnknownDataStructure } from '../../shared/interfaces/unknown-datastructure.interface.js';

export function buildTableWidgetDs(tableWidgetParams: IUnknownDataStructure): TableWidgetDS {
  return {
    id: tableWidgetParams.id,
    field_name: tableWidgetParams.field_name,
    widget_type: tableWidgetParams.widget_type,
    widget_params: tableWidgetParams.widget_params,
    widget_options: tableWidgetParams.widget_options,
    name: tableWidgetParams.name,
    description: tableWidgetParams.description,
  };
}
