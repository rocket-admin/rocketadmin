import { Component, Injectable, OnInit } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { format } from 'date-fns';

@Injectable()
@Component({
  selector: 'app-time-record-view',
  templateUrl: './time.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './time.component.css'],
  imports: []
})
export class TimeRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
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
