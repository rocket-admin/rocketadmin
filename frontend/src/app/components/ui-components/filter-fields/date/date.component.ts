import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { format } from 'date-fns'

@Component({
  selector: 'app-filter-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.css']
})
export class DateFilterComponent extends BaseFilterFieldComponent {
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
