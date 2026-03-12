import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { format } from 'date-fns';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-date',
	templateUrl: './date.component.html',
	styleUrls: ['./date.component.css'],
	imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule],
})
export class DateEditComponent extends BaseEditFieldComponent {
	readonly value = model<string>();

	static type = 'datetime';
	public date: string;

	ngOnInit(): void {
		super.ngOnInit();
		const val = this.value();
		if (val) {
			const datetime = new Date(val);
			this.date = format(datetime, 'yyyy-MM-dd');
		}
	}

	onDateChange() {
		this.onFieldChange.emit(this.date);
	}
}
