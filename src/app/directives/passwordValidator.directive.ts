import { Directive } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";
import { passwordValidation } from "../validators/password.validator";

@Directive({
    selector: '[passwordValidator][ngModel]',
    providers: [
        {
          provide: NG_VALIDATORS,
          useExisting: PasswordValidationDirective,
          multi: true
        }
      ]
})

export class PasswordValidationDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
      return passwordValidation()(control);
    }
}