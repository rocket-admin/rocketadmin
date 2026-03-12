import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-password',
	templateUrl: './password.component.html',
	styleUrls: ['./password.component.css'],
	imports: [MatFormFieldModule, MatInputModule, MatCheckboxModule, FormsModule],
})
export class PasswordEditComponent extends BaseEditFieldComponent {
	readonly value = model<string>();

	public clearPassword: boolean;

	ngOnInit(): void {
		super.ngOnInit();
		if (this.value() === '***') this.value.set('');
		if (this.value() !== '') {
			this.onFieldChange.emit(this.value());
		}
	}

	onPasswordChange(newValue: string) {
		if (newValue !== '') {
			this.onFieldChange.emit(newValue);
		}
	}

	onClearPasswordChange() {
		if (this.clearPassword) this.onFieldChange.emit(null);
	}
}
