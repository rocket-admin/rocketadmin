import { Component, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UrlValidatorDirective } from 'src/app/directives/url-validator.directive';

@Component({
  selector: 'app-edit-image',
  templateUrl: './image.component.html',
  styleUrl: './image.component.css',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    UrlValidatorDirective
  ]
})
export class ImageEditComponent extends BaseEditFieldComponent {
  @Input() value: string;
}
