import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-time',
	templateUrl: './time.component.html',
	styleUrls: ['./time.component.css'],
	imports: [MatFormFieldModule, MatInputModule, FormsModule],
})
export class TimeEditComponent extends BaseEditFieldComponent {
	readonly value = model<string>();

	static type = 'datetime';
}
