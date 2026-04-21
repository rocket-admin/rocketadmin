import { Directive } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { connectionStringValidation } from '../validators/connection-string.validator';

@Directive({
	selector: '[connectionStringValidator][ngModel]',
	providers: [
		{
			provide: NG_VALIDATORS,
			useExisting: ConnectionStringValidatorDirective,
			multi: true,
		},
	],
})
export class ConnectionStringValidatorDirective implements Validator {
	validate(control: AbstractControl): ValidationErrors | null {
		return connectionStringValidation()(control);
	}
}
