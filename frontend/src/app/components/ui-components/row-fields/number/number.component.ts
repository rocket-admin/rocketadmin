import { Component, Input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class NumberRowComponent extends BaseRowFieldComponent {
  @Input() value: number;

  static type = 'number';
}
