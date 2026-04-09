import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-select',
	templateUrl: './select.component.html',
	styleUrls: ['./select.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SelectFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
	@Input() value: string | (string | null)[] | null;

	public options: { value: string | null; label: string }[] = [];
	public selectedValues: (string | null)[] = [];

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

		if (Array.isArray(this.value)) {
			this.selectedValues = [...this.value];
		} else if (this.value === undefined) {
			this.selectedValues = [];
		} else {
			this.selectedValues = [this.value];
		}
	}

	ngAfterViewInit(): void {
		this.onComparatorChange.emit('eq');
	}

	onSelectionChange(values: (string | null)[]): void {
		this.selectedValues = values;

		if (!values || values.length === 0) {
			this.onFieldChange.emit(undefined);
			this.onComparatorChange.emit('eq');
			return;
		}

		if (values.length === 1) {
			this.onFieldChange.emit(values[0]);
			this.onComparatorChange.emit('eq');
			return;
		}

		this.onFieldChange.emit(values);
		this.onComparatorChange.emit('in');
	}
}
