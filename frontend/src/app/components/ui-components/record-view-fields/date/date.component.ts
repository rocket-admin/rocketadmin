import { Component, Injectable, OnInit } from '@angular/core';
import { format, parseISO } from 'date-fns';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-date-display',
  templateUrl: './date.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './date.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class DateRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
  static type = 'date';

  public formattedDate: string;

  ngOnInit(): void {
    if (this.value) {
      try {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          this.formattedDate = format(date, "P");
        } else {
          this.formattedDate = this.value;
        }
      } catch (error) {
        this.formattedDate = this.value;
      }
    }
  }
}
