import { CommonModule } from '@angular/common';

import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import * as pgInterval from 'postgres-interval';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-time-interval',
	imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule],
	templateUrl: './time-interval.component.html',
	styleUrls: ['./time-interval.component.css'],
})
export class TimeIntervalEditComponent extends BaseEditFieldComponent {
	readonly value = model<any>();

	public interval = {
		years: '',
		months: '',
		days: '',
		hours: '',
		minutes: '',
		seconds: '',
		milliseconds: '',
	};

	ngOnInit(): void {
		super.ngOnInit();
		if (this.value()) this.interval = this.value();
	}

	onInputChange() {
		// @ts-expect-error
		const currentInterval = pgInterval.prototype.toPostgres.call(this.interval);
		this.onFieldChange.emit(currentInterval);
	}
}
