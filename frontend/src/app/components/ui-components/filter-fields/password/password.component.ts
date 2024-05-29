import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css']
})
export class PasswordFilterComponent extends BaseFilterFieldComponent {
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
