import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { format } from 'date-fns'
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-row-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.css']
})
export class DateRowComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: string;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public date: string;
  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
    }

    this.normalizedLabel = normalizeFieldName(this.label);
  }

  onDateChange() {
    this.onFieldChange.emit(this.date);
  }
}
