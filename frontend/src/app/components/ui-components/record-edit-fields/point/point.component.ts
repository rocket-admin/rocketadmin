import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-edit-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.css'],
  imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule]
})
export class PointEditComponent extends BaseEditFieldComponent {
  @Input() value;
}
