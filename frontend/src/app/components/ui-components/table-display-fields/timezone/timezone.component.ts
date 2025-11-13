import { Component, Injectable } from '@angular/core';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-display-timezone',
  templateUrl: './timezone.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './timezone.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class TimezoneDisplayComponent extends BaseTableDisplayFieldComponent {
  get formattedTimezone(): string {
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
      return '';
    }
  }
}
