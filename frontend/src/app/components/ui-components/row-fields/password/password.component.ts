import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { Widget } from 'src/app/models/table';
import { normalizeFieldName } from 'src/app/lib/normalize';

@Component({
  selector: 'app-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css']
})
export class PasswordComponent implements OnInit {
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  public label: string;
  public clearPassword: boolean;

  constructor() { }

  ngOnInit(): void {
    console.log(this.widgetStructure);
    this.label = normalizeFieldName(this.widgetStructure.field_name);
    if (this.value === '***') this.value = '';
    this.onFieldChange.emit(this.value);
  }

  onClearPasswordChange() {
    if (this.clearPassword) this.onFieldChange.emit(null);
  }
}
