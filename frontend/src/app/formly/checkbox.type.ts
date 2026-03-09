import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FieldType, FieldTypeConfig, FormlyModule } from '@ngx-formly/core';

@Component({
	selector: 'formly-checkbox',
	template: `
		<mat-checkbox [formControl]="formControl" [formlyAttributes]="field" [indeterminate]="props['indeterminate']">
			{{ props.label }}
		</mat-checkbox>
	`,
	imports: [MatCheckboxModule, ReactiveFormsModule, FormlyModule],
})
export class CheckboxType extends FieldType<FieldTypeConfig> {}
