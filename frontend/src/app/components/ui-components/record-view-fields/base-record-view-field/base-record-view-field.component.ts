import { Component, input, output } from '@angular/core';
import { TableField, WidgetStructure } from 'src/app/models/table';

@Component({
	selector: 'app-base-record-view-field',
	templateUrl: './base-record-view-field.component.html',
	styleUrls: ['./base-record-view-field.component.css'],
})
export class BaseRecordViewFieldComponent {
	readonly key = input<string>();
	readonly value = input<any>();
	readonly structure = input<TableField>();
	readonly widgetStructure = input<WidgetStructure>();
	readonly rowData = input<Record<string, unknown>>();
	readonly primaryKeys = input<Record<string, unknown>>();

	readonly onCopyToClipboard = output<string>();
}
