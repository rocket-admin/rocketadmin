import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { format, formatDistanceToNow, differenceInHours, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

@Component({
  selector: 'app-date-time-display',
  templateUrl: './date-time.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './date-time.component.css'],
  imports: [CommonModule, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class DateTimeDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'datetime';

  public formattedDateTime: string;
  public formatDistanceWithinHours: number = 0;
  public fullDateTime: string;
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
          // Convert UTC to specified timezone
          const zonedDate = toZonedTime(utcDate, this.timezone);

          // Format the date in the target timezone
          this.fullDateTime = formatInTimeZone(utcDate, this.timezone, "PPpp");

          if (this.displayTimezone) {
            this.timezoneAbbr = formatInTimeZone(utcDate, this.timezone, "zzz");
          }

          // Check if formatDistanceWithinHours is enabled and date is within specified hours from now
          if (this.formatDistanceWithinHours > 0 && this.isWithinHours(zonedDate, this.formatDistanceWithinHours)) {
            this.formattedDateTime = formatDistanceToNow(zonedDate, { addSuffix: true });
          } else {
            this.formattedDateTime = formatInTimeZone(utcDate, this.timezone, "P p");
          }
        } else {
          this.formattedDateTime = this.value;
          this.fullDateTime = this.value;
        }
      } catch (error) {
        console.error('Error formatting datetime:', error);
        this.formattedDateTime = this.value;
        this.fullDateTime = this.value;
      }
    }
  }

  private parseWidgetParams(): void {
    if (this.widgetStructure?.widget_params) {
      try {
        const params = typeof this.widgetStructure.widget_params === 'string'
          ? JSON.parse(this.widgetStructure.widget_params)
          : this.widgetStructure.widget_params;

        if (params.formatDistanceWithinHours !== undefined) {
          this.formatDistanceWithinHours = Number(params.formatDistanceWithinHours) || 0;
        }

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

  private isWithinHours(date: Date, hours: number): boolean {
    const now = new Date();
    const hoursDifference = Math.abs(differenceInHours(date, now));
    return hoursDifference <= hours;
  }
}
