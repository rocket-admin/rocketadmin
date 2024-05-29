import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { format } from 'date-fns'

@Component({
  selector: 'app-row-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.css']
})
export class DateRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  static type = 'datetime';
  public date: string;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
    }
  }

  onDateChange() {
    this.onFieldChange.emit(this.date);
  }
}
