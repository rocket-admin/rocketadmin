import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { WidgetStructure } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-row-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.css']
})
export class LongTextRowComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;
  @Input() widgetStructure: WidgetStructure;

  @Output() onFieldChange = new EventEmitter();

  static type = 'text';
  public normalizedLabel: string;
  public rowsCount: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
    console.log(this.widgetStructure);
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      this.rowsCount = this.widgetStructure.widget_params.rows
    } else {
      this.rowsCount = '4'
    };
  }

}
