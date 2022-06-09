import { CreateTableWidgetDs } from '../application/data-sctructures/create-table-widgets.ds';
import { TableWidgetEntity } from '../table-widget.entity';

export function buildNewTableWidgetEntity(widget: CreateTableWidgetDs): TableWidgetEntity {
  const { description, field_name, name, widget_options, widget_params, widget_type } = widget;
  const newTableWidget = new TableWidgetEntity();
  newTableWidget.description = description;
  newTableWidget.field_name = field_name;
  newTableWidget.name = name;
  newTableWidget.widget_options = widget_options;
  newTableWidget.widget_params = widget_params;
  newTableWidget.widget_type = widget_type;
  return newTableWidget;
}
