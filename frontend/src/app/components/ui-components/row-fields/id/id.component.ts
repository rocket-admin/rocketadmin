import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-id',
  templateUrl: './id.component.html',
  styleUrls: ['./id.component.css']
})
export class IdRowComponent extends BaseRowFieldComponent {
  @Input() value: string;
}
