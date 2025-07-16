import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-edit-time',
  templateUrl: './time.component.html',
  styleUrls: ['./time.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class TimeEditComponent extends BaseEditFieldComponent {
  @Input() value: string;
  @Output() onFieldChange = new EventEmitter<string>();
  static type = 'datetime';
}
