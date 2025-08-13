import { Component, OnInit } from '@angular/core';
import { format, parseISO, formatDistanceToNow, differenceInHours } from 'date-fns';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-date-display',
  templateUrl: './date.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './date.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class DateDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'date';

  public formattedDate: string;
  public formatDistanceWithinHours: number = 48;
  public fullDate: string;

  ngOnInit(): void {
    this.parseWidgetParams();
    
    if (this.value) {
      try {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          // Always store the full date format for tooltip
          this.fullDate = format(date, "PPP"); // e.g., "April 29th, 2023"
          
          // Check if formatDistanceWithinHours is enabled and date is within specified hours from now
          if (this.formatDistanceWithinHours > 0 && this.isWithinHours(date, this.formatDistanceWithinHours)) {
            this.formattedDate = formatDistanceToNow(date, { addSuffix: true });
          } else {
            this.formattedDate = format(date, "P");
          }
        } else {
          this.formattedDate = this.value;
          this.fullDate = this.value;
        }
      } catch (error) {
        this.formattedDate = this.value;
        this.fullDate = this.value;
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
          this.formatDistanceWithinHours = Number(params.formatDistanceWithinHours) || 48;
        }
      } catch (e) {
        console.error('Error parsing date widget params:', e);
      }
    }
  }

  private isWithinHours(date: Date, hours: number): boolean {
    const now = new Date();
    const hoursDifference = Math.abs(differenceInHours(date, now));
    return hoursDifference <= hours;
  }
}
