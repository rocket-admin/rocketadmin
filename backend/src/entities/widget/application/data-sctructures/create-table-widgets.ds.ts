import { WidgetTypeEnum } from '../../../../enums/widget-type.enum.js';

export class CreateTableWidgetsDs {
	connectionId: string;
	masterPwd: string;
	tableName: string;
	userId: string;
	widgets: Array<CreateTableWidgetDs>;
}

export class CreateTableWidgetDs {
	description: string;
	field_name: string;
	name: string;
	widget_options: string | null;
	widget_params: string | null;
	widget_type?: WidgetTypeEnum;
}
