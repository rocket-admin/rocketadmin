import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-select',
	templateUrl: './select.component.html',
	styleUrls: ['./select.component.css'],
	imports: [CommonModule, FormsModule, MatSelectModule],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SelectFilterComponent extends BaseFilterFieldComponent {
	@Input() value: string;

	public options: { value: string | null; label: string }[] = [];

	originalOrder = () => {
		return 0;
	};

	ngOnInit(): void {
		const ws = this.widgetStructure();
		const struct = this.structure();
		if (ws) {
			this.options = ws.widget_params.options;
			if (ws.widget_params.allow_null) {
				this.options = [{ value: null, label: '' }, ...this.options];
			}
		} else if (struct) {
			this.options = struct.data_type_params.map((option) => {
				return { value: option, label: option };
			});
			if (struct.allow_null) {
				this.options = [{ value: null, label: '' }, ...this.options];
			}
		}
	}
}
