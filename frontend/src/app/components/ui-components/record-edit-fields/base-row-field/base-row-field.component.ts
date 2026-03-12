import { CommonModule } from '@angular/common';
import { Component, computed, input, OnInit, output } from '@angular/core';
import { TableField, TableForeignKey, WidgetStructure } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
	selector: 'app-base-edit-field',
	templateUrl: './base-row-field.component.html',
	styleUrl: './base-row-field.component.css',
	imports: [CommonModule],
})
export class BaseEditFieldComponent implements OnInit {
	readonly key = input<string>();
	readonly label = input<string>();
	readonly required = input<boolean>(false);
	readonly readonly = input<boolean>(false);
	readonly structure = input<TableField>();
	readonly disabled = input<boolean>(false);
	readonly widgetStructure = input<WidgetStructure>();
	readonly relations = input<TableForeignKey>();

	readonly onFieldChange = output<any>();

	readonly normalizedLabel = computed(() => normalizeFieldName(this.label() || ''));

	ngOnInit(): void {}
}
