import { Component, Injectable } from '@angular/core';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-timezone-record-view',
  templateUrl: './timezone.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './timezone.component.css'],
  imports: []
})
export class TimezoneRecordViewComponent extends BaseRecordViewFieldComponent {
  get formattedTimezone(): string {
    console.log('timezone', this.value)
    if (!this.value) {
      return '—';
    }

    try {
      const offset = this.getTimezoneOffset(this.value);
      return `${this.value} (UTC${offset})`;
    } catch (error) {
      return this.value;
    }
  }

  private getTimezoneOffset(timezone: string): string {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'longOffset'
      });

      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(part => part.type === 'timeZoneName');

      if (offsetPart && offsetPart.value.includes('GMT')) {
        const offset = offsetPart.value.replace('GMT', '');
        return offset === '' ? '+00:00' : offset;
      }

      // Fallback: calculate offset manually
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
      const hours = Math.floor(Math.abs(offsetMinutes) / 60);
      const minutes = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } catch (error) {
      console.error(error)
      return '';
    }
  }
}
