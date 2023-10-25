import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TableField, Widget } from 'src/app/models/table';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['./boolean.component.css']
})
export class BooleanComponent implements OnInit {
  @Input() value;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;
  @Input() widgetStructure: Widget;

  @Output() onFieldChange = new EventEmitter();

  public label: string;
  public isRadiogroup: boolean;
  constructor() { }

  ngOnInit(): void {
    if (this.value) {
      this.value = true;
    } else if (this.value === 0 || this.value === '') {
      this.value = false;
    } else {
      this.value = null;
    }

    this.isRadiogroup = (this.structure?.allow_null) || !!(this.widgetStructure?.widget_params?.structure?.allow_null);

    this.label = normalizeFieldName(this.structure.column_name);
  }
}
