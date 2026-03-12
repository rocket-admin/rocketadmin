import { Component } from '@angular/core';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
	selector: 'app-password-record-view',
	templateUrl: './password.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './password.component.css'],
	imports: [],
})
export class PasswordRecordViewComponent extends BaseRecordViewFieldComponent {}
