import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { format } from 'date-fns'
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-filter-date-time',
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css']
})
export class DateTimeFilterComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public date: string;
  public time: string;
  public normalizedLabel: string;

  constructor() {
  }

  ngOnInit(): void {
    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
      this.time = format(datetime, 'HH:mm:ss');
    }

    this.normalizedLabel = normalizeFieldName(this.label);
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
