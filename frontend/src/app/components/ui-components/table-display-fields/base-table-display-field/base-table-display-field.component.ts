import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableField, WidgetStructure } from 'src/app/models/table';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-base-display-field',
  templateUrl: './base-table-display-field.component.html',
  styleUrl: './base-table-display-field.component.css',
  imports: [CommonModule]
})
export class BaseTableDisplayFieldComponent {
  @Input() key: string;
  @Input() value: any;
  @Input() structure: TableField;
  @Input() widgetStructure: WidgetStructure;
  // @Input() relations: TableForeignKey;

  @Output() onCopyToClipboard = new EventEmitter<string>();
}
