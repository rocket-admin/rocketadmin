import * as pgInterval from 'postgres-interval'

import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-time-interval',
  templateUrl: './time-interval.component.html',
  styleUrls: ['./time-interval.component.css']
})
export class TimeIntervalRowComponent extends BaseRowFieldComponent {
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
    // @ts-ignore
    if (this.value) this.interval = {...pgInterval.parse(this.value)};
  }

  onInputChange() {
    // @ts-ignore
    const currentInterval = pgInterval.prototype.toPostgres.call(this.interval);
    this.onFieldChange.emit(currentInterval);
  }
}
