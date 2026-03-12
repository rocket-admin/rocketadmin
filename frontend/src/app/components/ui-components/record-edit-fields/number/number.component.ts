import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-number',
	templateUrl: './number.component.html',
	styleUrls: ['./number.component.css'],
	imports: [MatFormFieldModule, MatInputModule, FormsModule],
})
export class NumberEditComponent extends BaseEditFieldComponent {
	readonly value = model<number>();

	static type = 'number';
}
