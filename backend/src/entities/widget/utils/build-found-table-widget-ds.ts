import { FoundTableWidgetsDs } from '../application/data-sctructures/found-table-widgets.ds';
import { TableWidgetEntity } from '../table-widget.entity';

export function buildFoundTableWidgetDs(widget: TableWidgetEntity): FoundTableWidgetsDs {
  const { description, field_name, id, name, widget_options, widget_params, widget_type } = widget;
  return {
    description: description,
    field_name: field_name,
    id: id,
    name: name,
    widget_options: widget_options ? JSON.stringify(widget_options) : null,
    widget_params: widget_params ? widget_params : null,
    widget_type: widget_type,
  };
}
