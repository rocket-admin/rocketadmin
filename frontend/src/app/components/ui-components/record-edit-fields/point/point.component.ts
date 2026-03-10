import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-point',
	templateUrl: './point.component.html',
	styleUrls: ['./point.component.css'],
	imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule],
})
export class PointEditComponent extends BaseEditFieldComponent {
	readonly value = model<any>();
}
