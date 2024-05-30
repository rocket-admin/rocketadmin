import * as pgInterval from 'postgres-interval'

import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-time-interval',
  templateUrl: './time-interval.component.html',
  styleUrls: ['./time-interval.component.css']
})
export class TimeIntervalFilterComponent extends BaseFilterFieldComponent {
  @Input() value;

  public interval = {
    years: '',
    months: '',
    days: '',
    hours: '',
    minutes: '',
    seconds: '',
    milliseconds: ''
  };

  ngOnInit(): void {
    super.ngOnInit();
    // @ts-ignore
    if (this.value) this.interval = {...pgInterval.parse(this.value)};
  }

  onInputChange() {
    // @ts-ignore
    const currentInterval = pgInterval.prototype.toPostgres.call(this.interval);
    this.onFieldChange.emit(currentInterval);
  }
}
