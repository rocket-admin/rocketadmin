import { Component, Injectable, OnInit } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-time-interval-display',
  templateUrl: './time-interval.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './time-interval.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
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
