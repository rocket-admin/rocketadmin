import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';

@Component({
  selector: 'app-date-time-display',
  templateUrl: './date-time.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './date-time.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class DateTimeDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'datetime';

  public formattedDateTime: string;
  public formatDistanceWithinHours: number = 0;
  public fullDateTime: string;

  ngOnInit(): void {
    this.parseWidgetParams();
    
    if (this.value) {
      try {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          // Always store the full date/time format for tooltip
          this.fullDateTime = format(date, "PPpp"); // e.g., "Apr 29, 2023 at 10:30 AM"
          
          // Check if formatDistanceWithinHours is enabled and date is within specified hours from now
          if (this.formatDistanceWithinHours > 0 && this.isWithinHours(date, this.formatDistanceWithinHours)) {
            this.formattedDateTime = formatDistanceToNow(date, { addSuffix: true });
          } else {
            this.formattedDateTime = format(date, "P p");
          }
        } else {
          this.formattedDateTime = this.value;
          this.fullDateTime = this.value;
        }
      } catch (error) {
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
