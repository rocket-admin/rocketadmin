import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-filter-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css']
})
export class NumberFilterComponent extends BaseFilterFieldComponent {
  @Input() value: number;
  static type = 'number';
}
