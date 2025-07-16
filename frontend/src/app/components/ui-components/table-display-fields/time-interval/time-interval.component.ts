import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-time-interval-display',
  templateUrl: './time-interval.component.html',
  styleUrls: ['./time-interval.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class TimeIntervalDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'time-interval';
  
  formattedInterval: string;
  
  override ngOnInit() {
    super.ngOnInit();
    this.formatTimeInterval();
  }
  
  private formatTimeInterval() {
    if (!this.value) {
      this.formattedInterval = '';
      return;
    }
    
    try {
      // Try to format based on PostgreSQL interval format
      const interval = String(this.value);
      this.formattedInterval = interval;
    } catch (e) {
      this.formattedInterval = String(this.value);
    }
  }
}
