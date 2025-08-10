import { Component, Injectable, OnInit } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-time-interval-record-view',
  templateUrl: './time-interval.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './time-interval.component.css'],
  imports: []
})
export class TimeIntervalRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {

  formattedInterval: string;

  ngOnInit() {
    if (!this.value) {
      this.formattedInterval = '—';
      return;
    }

    try {
      const interval = typeof this.value === 'string' ? JSON.parse(this.value) : this.value;
      let parts = [];

      if (interval.days) parts.push(`${interval.days}d`);
      if (interval.hours) parts.push(`${interval.hours}h`);
      if (interval.minutes) parts.push(`${interval.minutes}m`);
      if (interval.seconds) parts.push(`${interval.seconds}s`);
      if (interval.milliseconds) parts.push(`${interval.milliseconds}ms`);

      this.formattedInterval = parts.length > 0 ? parts.join(' ') : '0';
    } catch (e) {
      this.formattedInterval = String(this.value);
    }
  }
}
