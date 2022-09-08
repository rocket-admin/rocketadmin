import { Directive } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";
import { base64Validation } from "../validators/base64.validator";

@Directive({
    selector: '[base64Validator][ngModel]',
    providers: [
        {
          provide: NG_VALIDATORS,
          useExisting: Base64ValidationDirective,
          multi: true
        }
      ]
})

export class Base64ValidationDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
      return base64Validation()(control);
    }
}