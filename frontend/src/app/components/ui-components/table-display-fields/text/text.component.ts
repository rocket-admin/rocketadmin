import { Component, Injectable } from '@angular/core';
import * as validator from 'validator';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-display-text',
  templateUrl: './text.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './text.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class TextDisplayComponent extends BaseTableDisplayFieldComponent {
  get isInvalid(): boolean {
    if (!this.value || this.value === '') {
      return false;
    }

    const validateType = this.widgetStructure?.widget_params?.validate;
    if (!validateType) {
      return false;
    }

    const stringValue = String(this.value);

    // Special case for regex validation
    if (validateType === 'regex') {
      const regexPattern = this.widgetStructure?.widget_params?.regex;
      if (!regexPattern) {
        return false;
      }
      try {
        const regex = new RegExp(regexPattern);
        return !regex.test(stringValue);
      } catch (error) {
        console.warn('Invalid regex pattern:', error);
        return false;
      }
    }

    // Check if validator has this method
    // biome-ignore lint: it is expected to import all exports of validator
    const validatorMethod = validator[validateType];
    if (typeof validatorMethod !== 'function') {
      console.warn(`Unknown validator method: ${validateType}`);
      return false;
    }

    try {
      // Call the validator method and invert result (true if invalid)
      return !validatorMethod(stringValue);
    } catch (error) {
      console.warn(`Validation error for ${validateType}:`, error);
      return false;
    }
  }

  get validationErrorMessage(): string {
    const validateType = this.widgetStructure?.widget_params?.validate;
    if (!validateType) {
      return '';
    }

    if (validateType === 'regex') {
      return 'Does not match the required pattern';
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
      isPostalCode: 'Invalid postal code'
    };

    return messages[validateType] || `Invalid ${validateType.replace(/^is/, '').toLowerCase()}`;
  }
}
