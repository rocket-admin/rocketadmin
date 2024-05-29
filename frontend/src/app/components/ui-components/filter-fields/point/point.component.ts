import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.css']
})
export class PointFilterComponent extends BaseFilterFieldComponent {
  @Input() value;
}
