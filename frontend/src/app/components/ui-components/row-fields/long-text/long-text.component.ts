import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.css']
})
export class LongTextComponent implements OnInit {
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  static type = 'text';
  public label: string;
  public name: string;
  public testId: string;
  public fieldType: string;
  public rowsCount: string;

  constructor() { }

  ngOnInit(): void {
    console.log(this.widgetStructure);
    if (this.widgetStructure) {
      this.label = this.widgetStructure.name;
      this.name = this.widgetStructure.field_name;
      this.testId = `record-${this.widgetStructure.field_name}-textarea-widget`;
      this.fieldType = this.widgetStructure.widget_type;
      this.rowsCount = this.widgetStructure.widget_params.rows || '4';
    } else {
      this.label = normalizeFieldName(this.structure.column_name);
      this.name = this.structure.column_name;
      this.testId = `record-${this.structure.column_name}-textarea`;
      this.fieldType = this.structure.data_type;
      this.rowsCount = '4';
    }
  }

}
