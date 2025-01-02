import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UrlValidatorDirective } from 'src/app/directives/url-validator.directive';

@Component({
  selector: 'app-url',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    UrlValidatorDirective
  ],
  templateUrl: './url.component.html',
  styleUrl: './url.component.css'
})
export class UrlRowComponent extends BaseRowFieldComponent {
  @Input() value: string;
}
