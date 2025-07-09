import * as pgInterval from 'postgres-interval'

import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-filter-time-interval',
  templateUrl: './time-interval.component.html',
  styleUrls: ['./time-interval.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule]
})
export class TimeIntervalFilterComponent extends BaseFilterFieldComponent {
  @Input() value;
  static type = 'number';

  public interval = {
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  };

  ngOnInit(): void {
    super.ngOnInit();

    if (this.value) this.interval = this.parseIntervalString(this.value);
  }

  onInputChange() {
    // @ts-ignore
    const currentInterval = pgInterval.prototype.toPostgres.call(this.interval);
    this.onFieldChange.emit(currentInterval);
  }

  parseIntervalString(input) {
    const units = {
      year: 'years',
      years: 'years',
      month: 'months',
      months: 'months',
      day: 'days',
      days: 'days',
      hour: 'hours',
      hours: 'hours',
      minute: 'minutes',
      minutes: 'minutes',
      second: 'seconds',
      seconds: 'seconds',
      millisecond: 'milliseconds',
      milliseconds: 'milliseconds',
    };

    const result = {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    };

    const regex = /(\d+(?:\.\d+)?)\s*(years?|months?|days?|hours?|minutes?|seconds?|milliseconds?)/gi;

    let match;
    while ((match = regex.exec(input)) !== null) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const key = units[unit];

      if (key) result[key] += value;
    }

    return result;
  }

}
