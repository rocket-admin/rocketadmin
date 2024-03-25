import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-filter-time',
  templateUrl: './time.component.html',
  styleUrls: ['./time.component.css']
})
export class TimeFilterComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;

  @Output() onFieldChange = new EventEmitter();

  static type = 'datetime';
  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }
}
