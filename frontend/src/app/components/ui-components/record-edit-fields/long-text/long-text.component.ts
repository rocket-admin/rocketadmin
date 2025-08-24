import { Component, Input, OnInit } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextValidatorDirective } from 'src/app/directives/text-validator.directive';

@Component({
  selector: 'app-edit-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.css'],
  imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule, TextValidatorDirective]
})
export class LongTextEditComponent extends BaseEditFieldComponent implements OnInit {
  @Input() value: string;

  static type = 'text';
  public rowsCount: string;
  maxLength: number | null = null;
  validateType: string | null = null;
  regexPattern: string | null = null;

  override ngOnInit(): void {
    super.ngOnInit();
    
    // Use character_maximum_length from the field structure if available
    if (this.structure && this.structure.character_maximum_length) {
      this.maxLength = this.structure.character_maximum_length;
    }

    // Parse widget parameters
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      const params = typeof this.widgetStructure.widget_params === 'string' 
        ? JSON.parse(this.widgetStructure.widget_params) 
        : this.widgetStructure.widget_params;
      
      this.rowsCount = params.rows || '4';
      this.validateType = params.validate || null;
      this.regexPattern = params.regex || null;
    } else {
      this.rowsCount = '4';
    }
  }

  getValidationErrorMessage(): string {
    if (!this.validateType) {
      return '';
    }

    if (this.validateType === 'regex') {
      return 'Value doesn\'t match the required pattern';
    }

    // Create user-friendly messages for common validators
    const messages = {
      isEmail: 'Invalid email address',
      isURL: 'Invalid URL',
      isIP: 'Invalid IP address',
      isUUID: 'Invalid UUID',
      isJSON: 'Invalid JSON',
      isCreditCard: 'Invalid credit card number',
      isISBN: 'Invalid ISBN',
      isAlpha: 'Should contain only letters',
      isNumeric: 'Should contain only numbers',
      isAlphanumeric: 'Should contain only letters and numbers',
      isHexColor: 'Invalid hex color',
      isBase64: 'Invalid Base64 string',
      isMobilePhone: 'Invalid mobile phone number',
      isMACAddress: 'Invalid MAC address',
      isPostalCode: 'Invalid postal code',
      isCurrency: 'Invalid currency format'
    };

    return messages[this.validateType] || `Invalid ${this.validateType}`;
  }
}
