import { Component, input, output } from '@angular/core';
import { TableField, WidgetStructure } from 'src/app/models/table';

@Component({
	selector: 'app-base-display-field',
	templateUrl: './base-table-display-field.component.html',
	styleUrl: './base-table-display-field.component.css',
	imports: [],
})
export class BaseTableDisplayFieldComponent {
	readonly key = input<string>();
	readonly value = input<any>();
	readonly structure = input<TableField>();
	readonly widgetStructure = input<WidgetStructure>();
	readonly rowData = input<Record<string, unknown>>();
	readonly primaryKeys = input<{ column_name: string }[]>();

	readonly onCopyToClipboard = output<string>();
}
