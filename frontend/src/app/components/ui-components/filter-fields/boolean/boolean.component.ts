import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DBtype } from 'src/app/models/connection';
import { ConnectionsService } from 'src/app/services/connections.service';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-boolean',
	templateUrl: './boolean.component.html',
	styleUrls: ['./boolean.component.css'],
	imports: [CommonModule, FormsModule, MatButtonToggleModule],
})
export class BooleanFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
	@Input() value;

	public isRadiogroup: boolean;
	public booleanValue: boolean | 'unknown';
	private connectionType: DBtype;

	constructor(private _connections: ConnectionsService) {
		super();
	}

	ngOnInit(): void {
		this.connectionType = this._connections.currentConnection.type;
		this.setBooleanValue();

		let parsedParams = null;
		const ws = this.widgetStructure();
		if (ws?.widget_params) {
			parsedParams = typeof ws.widget_params === 'string' ? JSON.parse(ws.widget_params) : ws.widget_params;
		}

		this.isRadiogroup = this.structure()?.allow_null || !!parsedParams?.allow_null;
	}

	ngAfterViewInit(): void {
		this.onComparatorChange.emit('eq');
	}

	setBooleanValue() {
		if (typeof this.value === 'boolean') {
			this.booleanValue = this.value;
			return;
		}

		if (this.value === null || this.value === undefined || this.value === '') {
			this.booleanValue = 'unknown';
			return;
		}

		switch (this.value) {
			case 0:
			case '0':
			case 'F':
			case 'N':
			case 'false':
				this.booleanValue = false;
				break;
			case 1:
			case '1':
			case 'T':
			case 'Y':
			case 'true':
				this.booleanValue = true;
				break;
		}
	}

	onBooleanChange() {
		let formattedValue;
		switch (this.connectionType) {
			case DBtype.MySQL:
			case DBtype.MSSQL:
			case DBtype.Oracle:
				formattedValue = this.booleanValue === 'unknown' ? null : Number(this.booleanValue);
				break;
			default:
				formattedValue = this.booleanValue === 'unknown' ? null : this.booleanValue;
		}

		this.onFieldChange.emit(formattedValue);
		this.onComparatorChange.emit('eq');
	}
}
