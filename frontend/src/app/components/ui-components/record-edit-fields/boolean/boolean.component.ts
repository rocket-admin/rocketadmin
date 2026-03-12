import { CommonModule } from '@angular/common';
import { Component, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DBtype } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-boolean',
	templateUrl: './boolean.component.html',
	styleUrls: ['./boolean.component.css'],
	imports: [CommonModule, FormsModule, MatButtonToggleModule],
})
export class BooleanEditComponent extends BaseEditFieldComponent {
	readonly value = model<boolean | number | string | null>();

	public isRadiogroup: boolean;
	connectionType: DBtype;

	private _connections = inject(ConnectionsService);

	ngOnInit(): void {
		super.ngOnInit();
		this.connectionType = this._connections.currentConnection.type;

		const val = this.value();
		if (val) {
			this.value.set(true);
		} else if (val === 0 || val === '' || val === false) {
			this.value.set(false);
		} else {
			this.value.set(null);
		}

		this.onFieldChange.emit(this.value());

		let parsedParams = null;
		const ws = this.widgetStructure();
		if (ws?.widget_params) {
			parsedParams = typeof ws.widget_params === 'string' ? JSON.parse(ws.widget_params) : ws.widget_params;
		}

		this.isRadiogroup = this.structure()?.allow_null || !!parsedParams?.allow_null;
	}

	onToggleChange(optionValue: boolean): void {
		if (this.value() === optionValue) {
			this.value.set(null);
		} else {
			this.value.set(optionValue);
		}
		this.onFieldChange.emit(this.value());
	}
}
