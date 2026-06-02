import { WidgetTypeEnum } from '../../../../enums/widget-type.enum.js';

export class FoundTableWidgetsDs {
	description?: string;
	field_name: string;
	id: string;
	name?: string;
	widget_options: string | null;
	widget_params: string | null;
	widget_type?: WidgetTypeEnum;
}
