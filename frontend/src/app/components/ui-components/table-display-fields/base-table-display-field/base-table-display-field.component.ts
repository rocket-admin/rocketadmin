import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, TableForeignKey, WidgetStructure } from 'src/app/models/table';

import { CommonModule } from '@angular/common';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-base-display-field',
  templateUrl: './base-table-display-field.component.html',
  styleUrl: './base-table-display-field.component.css',
  imports: [CommonModule]
})
export class BaseTableDisplayFieldComponent implements OnInit {
  @Input() key: string;
  @Input() value: any;
  @Input() structure: TableField;
  @Input() widgetStructure: WidgetStructure;
  // @Input() relations: TableForeignKey;

  @Output() onCopyToClipboard = new EventEmitter<string>();

  // public normalizedLabel: string;

  ngOnInit(): void {
    // this.normalizedLabel = normalizeFieldName(this.label);
  }
}
