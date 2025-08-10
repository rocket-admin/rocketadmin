import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, WidgetStructure } from 'src/app/models/table';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-base-record-view-field',
  templateUrl: './base-record-view-field.component.html',
  styleUrls: ['./base-record-view-field.component.css'],
  imports: [CommonModule]
})
export class BaseRecordViewFieldComponent {
  @Input() key: string;
  @Input() value: any;
  @Input() structure: TableField;
  @Input() widgetStructure: WidgetStructure;
  // @Input() relations: TableForeignKey;

  @Output() onCopyToClipboard = new EventEmitter<string>();
}
