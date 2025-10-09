import { Component, Injectable, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { format, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

@Injectable()
@Component({
  selector: 'app-date-time-record-view',
  templateUrl: './date-time.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './date-time.component.css'],
  imports: [CommonModule]
})
export class DateTimeRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  static type = 'datetime';

  public formattedDateTime: string;
  public timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;
  public displayTimezone: boolean = false;
  public timezoneAbbr: string = '';

  ngOnInit(): void {
    this.parseWidgetParams();

    if (this.value) {
      try {
        // Parse the UTC date from server
        const utcDate = typeof this.value === 'string' ? parseISO(this.value) : new Date(this.value);

        if (!isNaN(utcDate.getTime())) {
          // Format the date in the target timezone
          this.formattedDateTime = formatInTimeZone(utcDate, this.timezone, "P p");

          if (this.displayTimezone) {
            this.timezoneAbbr = formatInTimeZone(utcDate, this.timezone, "zzz");
          }
        } else {
          this.formattedDateTime = this.value;
        }
      } catch (error) {
        console.error('Error formatting datetime:', error);
        this.formattedDateTime = this.value;
      }
    }
  }

  private parseWidgetParams(): void {
    if (this.widgetStructure?.widget_params) {
      try {
        const params = typeof this.widgetStructure.widget_params === 'string'
          ? JSON.parse(this.widgetStructure.widget_params)
          : this.widgetStructure.widget_params;

        // Parse timezone parameter, default to user's local timezone
        if (params.timezone) {
          this.timezone = params.timezone;
        }

        // Parse displayTimezone parameter to show timezone abbreviation
        if (params.displayTimezone !== undefined) {
          this.displayTimezone = params.displayTimezone === true || params.displayTimezone === 'true';
        }
      } catch (e) {
        console.error('Error parsing datetime widget params:', e);
      }
    }
  }
}
