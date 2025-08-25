import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import * as validator from 'validator';

@Directive({
  selector: '[textValidator][ngModel]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: TextValidatorDirective,
      multi: true
    }
  ]
})
export class TextValidatorDirective implements Validator {
  @Input('validateType') validateType: string | null = null;
  @Input('regexPattern') regexPattern: string | null = null;
  
  validate(control: AbstractControl): ValidationErrors | null {
    if (!control.value || control.value === '') {
      return null;
    }

    if (!this.validateType) {
      return null;
    }

    const stringValue = String(control.value);

    // Special case for regex validation
    if (this.validateType === 'regex') {
      if (!this.regexPattern) {
        return null;
      }
      try {
        const regex = new RegExp(this.regexPattern);
        if (!regex.test(stringValue)) {
          return { invalidPattern: true };
        }
      } catch (error) {
        console.warn('Invalid regex pattern:', error);
        return null;
      }
      return null;
    }

    // Check if validator has this method
    const validatorMethod = validator[this.validateType];
    if (typeof validatorMethod !== 'function') {
      console.warn(`Unknown validator method: ${this.validateType}`);
      return null;
    }

    try {
      // Call the validator method
      const isValid = validatorMethod(stringValue);
      if (!isValid) {
        return { [`invalid${this.validateType}`]: true };
      }
    } catch (error) {
      console.warn(`Validation error for ${this.validateType}:`, error);
      return null;
    }

    return null;
  }
}