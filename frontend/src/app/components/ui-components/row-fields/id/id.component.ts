import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-row-id',
  templateUrl: './id.component.html',
  styleUrls: ['./id.component.css'],
  imports: [FormsModule, MatFormFieldModule, MatInputModule]
})
export class IdRowComponent extends BaseRowFieldComponent {
  @Input() value: string;
}
