import { Directive } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";
import { hostnameValidation } from "../validators/hostname.validator";

@Directive({
    selector: '[hostnameValidator][ngModel]',
    providers: [
        {
          provide: NG_VALIDATORS,
          useExisting: HostnameValidationDirective,
          multi: true
        }
      ]
})

export class HostnameValidationDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
      return hostnameValidation()(control);
    }
}