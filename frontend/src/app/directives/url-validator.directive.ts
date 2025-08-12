import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { urlValidation } from '../validators/url.validator';

@Directive({
  selector: '[urlValidator][ngModel]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: UrlValidatorDirective,
      multi: true
    }
  ]
})
export class UrlValidatorDirective implements Validator {
  @Input('urlPrefix') prefix: string = '';
  
  validate(control: AbstractControl): ValidationErrors | null {
    return urlValidation(this.prefix)(control);
  }
}
