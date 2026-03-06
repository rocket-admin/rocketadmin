import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-static-text',
	templateUrl: './binary-data-caption.component.html',
	styleUrls: ['./binary-data-caption.component.css'],
	imports: [CommonModule],
})
export class BinaryDataCaptionEditComponent extends BaseEditFieldComponent {}
