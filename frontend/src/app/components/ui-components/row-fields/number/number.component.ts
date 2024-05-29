import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css']
})
export class NumberRowComponent extends BaseRowFieldComponent {
  @Input() value: number;

  static type = 'number';
}
