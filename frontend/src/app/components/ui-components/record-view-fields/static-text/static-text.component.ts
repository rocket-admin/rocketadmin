import { Component } from '@angular/core';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
	selector: 'app-static-text-record-view',
	templateUrl: './static-text.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './static-text.component.css'],
	imports: [],
})
export class StaticTextRecordViewComponent extends BaseRecordViewFieldComponent {}
