import { Component, Input } from '@angular/core';
import { WidgetStructure, TableField } from '../../../../models/table';

@Component({
  selector: 'app-base-record-view-field',
  template: '',
  styles: []
})
export class BaseRecordViewFieldComponent {
  @Input() value: any;
  @Input() key: string;
  @Input() widgetStructure: WidgetStructure;
  @Input() structure: TableField;
}

