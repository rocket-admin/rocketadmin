import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-row-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css']
})
export class SelectRowComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;
  @Input() disabled: boolean;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  public normalizedLabel: string;
  public options: {value: string | null, label: string}[] = [];

  originalOrder = () => { return 0; }

  constructor() { }

  ngOnInit(): void {
    if (this.widgetStructure) {
      this.options = this.widgetStructure.widget_params.options;
      if (this.widgetStructure.widget_params.allow_null) {
        this.options = [{ value: null, label: '' }, ...this.options];
      }
    } else if (this.structure) {
      this.options = this.structure.data_type_params.map((option) => {
        return { value: option, label: option };
      });
      if (this.structure.allow_null) {
        this.options = [{ value: null, label: '' }, ...this.options];
      }
    }
    this.normalizedLabel = normalizeFieldName(this.label);
  }
}
