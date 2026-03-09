import { Component, input, OnInit, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
	selector: 'app-foreign-key-record-view',
	templateUrl: './foreign-key.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './foreign-key.component.css'],
	imports: [MatIconModule, RouterModule],
})
export class ForeignKeyRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
	readonly link = input<string>();
	readonly primaryKeysParams = input<any>();
	readonly displayValue = input<string>();

	readonly onForeignKeyClick = output<{ foreignKey: any; value: string }>();

	public foreignKeyURLParams: any;

	ngOnInit() {
		this.foreignKeyURLParams = { ...this.primaryKeysParams(), mode: 'view' };
	}
}
