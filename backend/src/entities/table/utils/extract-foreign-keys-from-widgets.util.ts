import JSON5 from 'json5';
import { WidgetTypeEnum } from '../../../enums/widget-type.enum.js';
import { TableWidgetEntity } from '../../widget/table-widget.entity.js';
import { ForeignKeyDSInfo } from '../table-datastructures.js';

export function extractForeignKeysFromWidgets(tableWidgets: Array<TableWidgetEntity>): Array<ForeignKeyDSInfo> {
	return tableWidgets
		.filter((widget) => widget.widget_type === WidgetTypeEnum.Foreign_key)
		.reduce<Array<ForeignKeyDSInfo>>((acc, widget) => {
			if (widget.widget_params) {
				try {
					acc.push(JSON5.parse(widget.widget_params) as ForeignKeyDSInfo);
				} catch (_e) {
					// skip malformed widget params
				}
			}
			return acc;
		}, []);
}
