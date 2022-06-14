import { TableWidgetEntity } from '../table-widget.entity';
import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds';

export function buildFoundTableWidgetDs(widget: TableWidgetEntity): FoundTableWidgetsDs {
  const { description, field_name, id, name, widget_options, widget_params, widget_type } = widget;
  return {
    description: description,
    field_name: field_name,
    id: id,
    name: name,
    widget_options: widget_options,
    widget_params: widget_params,
    widget_type: widget_type,
  };
}
