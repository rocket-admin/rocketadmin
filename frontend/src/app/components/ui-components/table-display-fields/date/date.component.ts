import { Component, OnInit } from '@angular/core';
import { format, parseISO } from 'date-fns';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-date-display',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class DateDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  static type = 'date';
  
  public formattedDate: string;
  
  override ngOnInit(): void {
    super.ngOnInit();
    
    if (this.value) {
      try {
        const date = new Date(this.value);
        if (!isNaN(date.getTime())) {
          this.formattedDate = format(date, 'yyyy-MM-dd');
        } else {
          this.formattedDate = this.value;
        }
      } catch (error) {
        this.formattedDate = this.value;
      }
    }
  }
}
