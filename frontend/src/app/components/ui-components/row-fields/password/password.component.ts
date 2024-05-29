import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css']
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
