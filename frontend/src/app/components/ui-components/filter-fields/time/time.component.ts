import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-time',
  templateUrl: './time.component.html',
  styleUrls: ['./time.component.css']
})
export class TimeFilterComponent extends BaseFilterFieldComponent {
  @Input() value;
  static type = 'datetime';
}
