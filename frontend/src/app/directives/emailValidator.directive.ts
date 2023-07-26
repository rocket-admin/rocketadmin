import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";

import { Directive } from "@angular/core";
import { emailValidation } from "../validators/email.validator";

@Directive({
    selector: '[emailValidator][ngModel]',
    providers: [
        {
          provide: NG_VALIDATORS,
          useExisting: EmailValidationDirective,
          multi: true
        }
      ]
})

export class EmailValidationDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
      return emailValidation()(control);
    }
}