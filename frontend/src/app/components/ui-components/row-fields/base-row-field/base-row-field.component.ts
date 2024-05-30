import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, TableForeignKey, WidgetStructure } from 'src/app/models/table';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-base-row-field',
  templateUrl: './base-row-field.component.html',
  styleUrl: './base-row-field.component.css'
})
export class BaseRowFieldComponent implements OnInit {
  @Input() key: string;
  @Input() label: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;
  @Input() disabled: boolean;
  @Input() widgetStructure: WidgetStructure;
  @Input() relations: TableForeignKey;

  @Output() onFieldChange = new EventEmitter<any>();

  public normalizedLabel: string;

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }
}
