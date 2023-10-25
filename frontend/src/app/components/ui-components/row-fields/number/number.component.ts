import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { TableField } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css']
})
export class NumberComponent implements OnInit {
  @Input() value: number;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;

  @Output() onFieldChange = new EventEmitter();

  static type = 'number';
  public label: string;

  constructor() { }

  ngOnInit(): void {
    this.label = normalizeFieldName(this.structure.column_name);
  }

}
