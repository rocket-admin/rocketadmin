import { Directive } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";
import { hexValidation } from "../validators/hex.validator";

@Directive({
    selector: '[hexValidator][ngModel]',
    providers: [
        {
          provide: NG_VALIDATORS,
          useExisting: HexValidationDirective,
          multi: true
        }
      ]
})

export class HexValidationDirective implements Validator {
    validate(control: AbstractControl): ValidationErrors | null {
      return hexValidation()(control);
    }
}