import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { TableField } from 'src/app/models/table';
import { format } from 'date-fns'
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.css']
})
export class DateComponent implements OnInit {

  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public label: string;
  public date: string;

  constructor() { }

  ngOnInit(): void {
    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
    }

    this.label = normalizeFieldName(this.structure.column_name);
  }

  onDateChange() {
    this.onFieldChange.emit(this.date);
  }
}
