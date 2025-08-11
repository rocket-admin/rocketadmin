import { Component, Injectable, OnInit } from '@angular/core';
import { format, parseISO } from 'date-fns';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-date-record-view',
  templateUrl: './date.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './date.component.css'],
  imports: []
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
