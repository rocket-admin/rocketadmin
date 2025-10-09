import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { format, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

@Component({
  selector: 'app-filter-date-time',
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule]
})
export class DateTimeFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
  @Input() value: string;
  @ViewChild('dateInputElement') dateInputElement: ElementRef<HTMLInputElement>;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public date: string;
  public time: string;
  public timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;

  ngOnInit(): void {
    super.ngOnInit();
    this.parseWidgetParams();

    if (this.value) {
      // Parse the UTC date from server
      const utcDate = typeof this.value === 'string' ? parseISO(this.value) : new Date(this.value);
      // Convert UTC to user's timezone for display
      const zonedDate = toZonedTime(utcDate, this.timezone);
      this.date = format(zonedDate, 'yyyy-MM-dd');
      this.time = format(zonedDate, 'HH:mm:ss');
    }
  }

  onDateChange() {
    if (!this.time) this.time = '00:00:00';
    this.emitUtcDateTime();
  }

  onTimeChange() {
    if (this.date) {
      this.emitUtcDateTime();
    }
  }

  private emitUtcDateTime() {
    try {
      // Create a date in the user's timezone
      const localDateTimeString = `${this.date}T${this.time}`;
      const localDate = new Date(localDateTimeString);

      // Convert from user's timezone to UTC
      const utcDate = fromZonedTime(localDate, this.timezone);
      // Format as ISO string without milliseconds for backward compatibility
      const utcIsoString = utcDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

      this.onFieldChange.emit(utcIsoString);
    } catch (error) {
      console.error('Error converting datetime to UTC:', error);
    }
  }

  ngAfterViewInit(): void {
    if (this.autofocus && this.dateInputElement) {
      setTimeout(() => {
        this.dateInputElement.nativeElement.focus();
      }, 100);
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
      } catch (e) {
        console.error('Error parsing datetime widget params:', e);
      }
    }
  }
}
