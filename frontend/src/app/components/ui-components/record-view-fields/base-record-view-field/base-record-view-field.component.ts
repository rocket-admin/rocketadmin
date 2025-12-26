import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableField, WidgetStructure } from 'src/app/models/table';

@Component({
	selector: 'app-base-record-view-field',
	templateUrl: './base-record-view-field.component.html',
	styleUrls: ['./base-record-view-field.component.css'],
	imports: [CommonModule],
})
export class BaseRecordViewFieldComponent {
	@Input() key: string;
	@Input() value: any;
	@Input() structure: TableField;
	@Input() widgetStructure: WidgetStructure;
	@Input() rowData: Record<string, unknown>;
	@Input() primaryKeys: Record<string, unknown>;
	// @Input() relations: TableForeignKey;

	@Output() onCopyToClipboard = new EventEmitter<string>();
}
