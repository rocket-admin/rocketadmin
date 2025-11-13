import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-edit-timezone',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './timezone.component.html',
  styleUrls: ['./timezone.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TimezoneEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  public timezones: { value: string, label: string }[] = [];

  originalOrder = () => { return 0; }

  ngOnInit(): void {
    super.ngOnInit();
    this.initializeTimezones();
  }

  private initializeTimezones(): void {
    // Get all available timezone identifiers from Intl API
    const timezoneList = Intl.supportedValuesOf('timeZone');

    // Map timezones to format with offset and readable label
    this.timezones = timezoneList.map(tz => {
      const offset = this.getTimezoneOffset(tz);
      return {
        value: tz,
        label: `${tz} (UTC${offset})`
      };
    });

    // Sort by timezone name
    this.timezones.sort((a, b) => a.value.localeCompare(b.value));

    // Check widget params for allow_null option
    if (this.widgetStructure?.widget_params?.allow_null) {
      this.timezones = [{ value: null, label: '' }, ...this.timezones];
    } else if (this.structure?.allow_null) {
      this.timezones = [{ value: null, label: '' }, ...this.timezones];
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
        // Extract offset from "GMT+XX:XX" format
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
