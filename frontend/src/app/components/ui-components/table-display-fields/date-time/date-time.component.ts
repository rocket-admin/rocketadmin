import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { format } from 'date-fns';

@Component({
  selector: 'app-date-time-display',
  templateUrl: './date-time.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './date-time.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class DateTimeDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'datetime';

  public formattedDateTime: string;

  ngOnInit(): void {
    if (this.value) {
      try {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          this.formattedDateTime = format(date, "P p");
        } else {
          this.formattedDateTime = this.value;
        }
      } catch (error) {
        this.formattedDateTime = this.value;
      }
    }
  }
}
