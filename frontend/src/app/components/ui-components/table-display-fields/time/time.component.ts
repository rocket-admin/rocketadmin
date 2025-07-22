import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { format } from 'date-fns';

@Component({
  selector: 'app-time-display',
  templateUrl: './time.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './time.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class TimeDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'time';

  public formattedTime: string;

  ngOnInit(): void {
    if (this.value) {
      try {
        if (this.value.includes(':')) {
          // Handle time string format
          this.formattedTime = this.value;
        } else {
          const date = new Date(this.value);
          if (!isNaN(date.getTime())) {
            this.formattedTime = format(date, 'HH:mm:ss');
          } else {
            this.formattedTime = this.value;
          }
        }
      } catch (error) {
        this.formattedTime = this.value;
      }
    }
  }
}
