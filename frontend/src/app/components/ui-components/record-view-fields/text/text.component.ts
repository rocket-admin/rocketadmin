import { Component, Injectable } from '@angular/core';
import * as validator from 'validator';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-text-record-view',
  templateUrl: './text.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './text.component.css'],
  imports: []
})
export class TextRecordViewComponent extends BaseRecordViewFieldComponent {
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
