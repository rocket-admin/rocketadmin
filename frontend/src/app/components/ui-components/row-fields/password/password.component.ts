import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { normalizeFieldName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-row-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css']
})
export class PasswordRowComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;
  public clearPassword: boolean;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
    if (this.value === '***') this.value = '';
    this.onFieldChange.emit(this.value);
  }

  onClearPasswordChange() {
    if (this.clearPassword) this.onFieldChange.emit(null);
  }
}
