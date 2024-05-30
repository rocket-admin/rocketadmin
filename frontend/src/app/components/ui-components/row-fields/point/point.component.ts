import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.css']
})
export class PointRowComponent extends BaseRowFieldComponent {
  @Input() value;
}
