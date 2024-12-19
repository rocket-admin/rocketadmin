import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-row-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    FormsModule
  ]
})
export class PasswordRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  public clearPassword: boolean;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.value === '***') this.value = '';
    this.onFieldChange.emit(this.value);
  }

  onClearPasswordChange() {
    if (this.clearPassword) this.onFieldChange.emit(null);
  }
}
