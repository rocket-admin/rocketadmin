import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-static-text',
	imports: [CommonModule],
	templateUrl: './static-text.component.html',
	styleUrls: ['./static-text.component.css'],
})
export class StaticTextEditComponent extends BaseEditFieldComponent {
	readonly value = model<string>();
}
