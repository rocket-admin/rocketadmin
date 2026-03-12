import { CommonModule } from '@angular/common';
import { Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { format } from 'date-fns';
import { DBtype } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-date-time',
	templateUrl: './date-time.component.html',
	styleUrls: ['./date-time.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
})
export class DateTimeEditComponent extends BaseEditFieldComponent {
	readonly value = model<string>();

	static type = 'datetime';
	public date: string;
	public time: string;
	public connectionType: DBtype;

	private _connections = inject(ConnectionsService);

	ngOnInit(): void {
		super.ngOnInit();
		this.connectionType = this._connections.currentConnection.type;

		const val = this.value();
		if (val) {
			const datetime = new Date(val);
			this.date = format(datetime, 'yyyy-MM-dd');
			this.time = format(datetime, 'HH:mm:ss');
		}
	}

	onDateChange() {
		if (!this.time) this.time = '00:00:00';

		let datetime = '';
		if (this.connectionType === DBtype.MySQL) {
			datetime = `${this.date} ${this.time}`;
		} else {
			datetime = `${this.date}T${this.time}Z`;
		}

		this.onFieldChange.emit(datetime);
	}

	onTimeChange() {
		let datetime = '';
		if (this.connectionType === DBtype.MySQL) {
			datetime = `${this.date} ${this.time}`;
		} else {
			datetime = `${this.date}T${this.time}Z`;
		}

		this.onFieldChange.emit(datetime);
	}
}
