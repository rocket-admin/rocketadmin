import { Component, Injectable, OnInit } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { format } from 'date-fns';

@Injectable()
@Component({
  selector: 'app-date-time-display',
  templateUrl: './date-time.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './date-time.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class DateTimeRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
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
