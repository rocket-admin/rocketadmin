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
  public formatDistance: boolean = false;

  ngOnInit(): void {
    this.parseWidgetParams();
    
    if (this.value) {
      try {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          // Check if formatDistance is enabled and date is within 24 hours from now
          if (this.formatDistance && this.isWithin24Hours(date)) {
            this.formattedDate = formatDistanceToNow(date, { addSuffix: true });
          } else {
            this.formattedDate = format(date, "P");
          }
        } else {
          this.formattedDate = this.value;
        }
      } catch (error) {
        this.formattedDate = this.value;
      }
    }
  }

  private parseWidgetParams(): void {
    if (this.widgetStructure?.widget_params) {
      try {
        const params = typeof this.widgetStructure.widget_params === 'string' 
          ? JSON.parse(this.widgetStructure.widget_params) 
          : this.widgetStructure.widget_params;
        
        if (params.formatDistance !== undefined) {
          this.formatDistance = params.formatDistance;
        }
      } catch (e) {
        console.error('Error parsing date widget params:', e);
      }
    }
  }

  private isWithin24Hours(date: Date): boolean {
    const now = new Date();
    const hoursDifference = Math.abs(differenceInHours(date, now));
    return hoursDifference <= 24;
  }
}
