import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { format } from 'date-fns'

@Component({
  selector: 'app-filter-date-time',
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css']
})
export class DateTimeFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public date: string;
  public time: string;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
      this.time = format(datetime, 'HH:mm:ss');
    }
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
