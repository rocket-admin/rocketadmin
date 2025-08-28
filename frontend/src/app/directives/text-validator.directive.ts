import * as validator from 'validator';

import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { Directive, Input } from '@angular/core';

import { textValidation } from '../validators/text.validator';

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
    return textValidation(this.validateType, this.regexPattern)(control);
  }
}