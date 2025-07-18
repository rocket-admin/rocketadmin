import { Component, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-edit-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    FormsModule
  ]
})
export class PasswordEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  public clearPassword: boolean;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.value === '***') this.value = '';
    // Don't emit empty password value to skip sending it to backend
    if (this.value !== '') {
      this.onFieldChange.emit(this.value);
    }
  }

  onPasswordChange(newValue: string) {
    // Only emit non-empty values to prevent sending empty strings to backend
    if (newValue !== '') {
      this.onFieldChange.emit(newValue);
    }
  }

  onClearPasswordChange() {
    if (this.clearPassword) this.onFieldChange.emit(null);
  }
}
