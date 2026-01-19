import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-id',
	templateUrl: './id.component.html',
	styleUrls: ['./id.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
})
export class IdEditComponent extends BaseEditFieldComponent {
	@Input() value: string;
}
