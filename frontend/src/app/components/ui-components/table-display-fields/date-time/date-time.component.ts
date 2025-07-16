import { Component, OnInit } from '@angular/core';
import { format } from 'date-fns';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-date-time-display',
  templateUrl: './date-time.component.html',
  styleUrls: ['./date-time.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class DateTimeDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'datetime';
  
  public formattedDateTime: string;
  
  override ngOnInit(): void {
    super.ngOnInit();
    
    if (this.value) {
      try {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          this.formattedDateTime = format(date, 'yyyy-MM-dd HH:mm:ss');
        } else {
          this.formattedDateTime = this.value;
        }
      } catch (error) {
        this.formattedDateTime = this.value;
      }
    }
  }
}
