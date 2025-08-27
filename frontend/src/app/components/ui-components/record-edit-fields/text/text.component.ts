import { Component, Injectable, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
<<<<<<< Updated upstream
=======
import { CommonModule } from '@angular/common';
import { TextValidatorDirective } from 'src/app/directives/text-validator.directive';
import { FieldValidationDirective } from 'src/app/directives/field-validation.directive';
>>>>>>> Stashed changes

@Injectable()

@Component({
  selector: 'app-edit-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css'],
<<<<<<< Updated upstream
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
=======
  imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule, TextValidatorDirective, FieldValidationDirective]
>>>>>>> Stashed changes
})
export class TextEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  static type = 'text';
}
