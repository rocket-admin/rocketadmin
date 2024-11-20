import { Directive, Input } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";
import { hostnameValidation } from "../validators/hostname.validator";
import { DBtype } from "../models/connection";

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
    @Input() hostnameValidator: DBtype;

    validate(control: AbstractControl): ValidationErrors | null {
      return hostnameValidation(this.hostnameValidator)(control);
    }
}