import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-time',
  templateUrl: './time.component.html',
  styleUrls: ['./time.component.css']
})
export class TimeRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  static type = 'datetime';
}
