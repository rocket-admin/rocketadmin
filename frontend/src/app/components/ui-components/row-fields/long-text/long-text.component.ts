import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { normalizeFieldName } from '../../../../lib/normalize';
import { Widget } from 'src/app/models/table';

@Component({
  selector: 'app-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.css']
})
export class LongTextComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  static type = 'text';
  public normalizedLabel: string;
  public rowsCount: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      this.rowsCount = this.widgetStructure.widget_params.rows
    } else {
      this.rowsCount = '4'
    };
  }
}
