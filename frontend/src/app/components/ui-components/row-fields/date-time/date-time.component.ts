import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { TableField } from 'src/app/models/table';
import { format } from 'date-fns'
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-date-time',
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css']
})
export class DateTimeComponent implements OnInit {
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() structure: TableField;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public date: string;
  public time: string;
  public label: string;

  constructor() {
  }

  ngOnInit(): void {
    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
      this.time = format(datetime, 'HH:mm:ss');
    }

    this.label = normalizeFieldName(this.structure.column_name);
  }

  onDateChange() {
    if (!this.time) this.time = '00:00';
    const datetime = `${this.date}T${this.time}Z`;
    this.onFieldChange.emit(datetime);
  }

  onTimeChange() {
    const datetime = `${this.date}T${this.time}Z`;
    this.onFieldChange.emit(datetime);
  }
}
