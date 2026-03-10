import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-select',
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
	templateUrl: './select.component.html',
	styleUrls: ['./select.component.css'],
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SelectEditComponent extends BaseEditFieldComponent {
	readonly value = model<string>();

	public options: { value: string | null; label: string }[] = [];

	originalOrder = () => {
		return 0;
	};

	ngOnInit(): void {
		super.ngOnInit();
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
