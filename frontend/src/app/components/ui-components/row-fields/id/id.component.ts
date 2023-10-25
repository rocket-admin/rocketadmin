import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { TableField } from 'src/app/models/table';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-id',
  templateUrl: './id.component.html',
  styleUrls: ['./id.component.css']
})
export class IdComponent implements OnInit {
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;

  @Output() onFieldChange = new EventEmitter();

  public label: string;

  constructor() { }

  ngOnInit(): void {
    this.label = normalizeFieldName(this.structure.column_name);
  }

}
