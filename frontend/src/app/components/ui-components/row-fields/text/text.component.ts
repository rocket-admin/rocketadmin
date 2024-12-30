import { Component, Injectable, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Injectable()

@Component({
  selector: 'app-row-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class TextRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  static type = 'text';
}
