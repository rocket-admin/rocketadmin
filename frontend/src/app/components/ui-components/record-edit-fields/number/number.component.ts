import { Component, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-edit-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class NumberEditComponent extends BaseEditFieldComponent {
  @Input() value: number;

  static type = 'number';
}
