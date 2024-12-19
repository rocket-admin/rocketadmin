import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-row-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class PointRowComponent extends BaseRowFieldComponent {
  @Input() value;
}
