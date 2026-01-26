import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableField, WidgetStructure } from 'src/app/models/table';

@Component({
	selector: 'app-base-display-field',
	templateUrl: './base-table-display-field.component.html',
	styleUrl: './base-table-display-field.component.css',
	imports: [CommonModule],
})
export class BaseTableDisplayFieldComponent {
	@Input() key: string;
	@Input() value: any;
	@Input() structure: TableField;
	@Input() widgetStructure: WidgetStructure;
	@Input() rowData: Record<string, unknown>;
	@Input() primaryKeys: { column_name: string }[];
	// @Input() relations: TableForeignKey;

	@Output() onCopyToClipboard = new EventEmitter<string>();
}
