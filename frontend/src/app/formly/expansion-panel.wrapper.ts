import { Component } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { FieldWrapper, FormlyModule } from '@ngx-formly/core';

@Component({
	selector: 'formly-expansion-panel',
	template: `
		<mat-expansion-panel>
			<mat-expansion-panel-header>
				<mat-panel-title>{{ props.label }}</mat-panel-title>
			</mat-expansion-panel-header>
			<div class="option-group">
				<ng-container #fieldComponent></ng-container>
			</div>
		</mat-expansion-panel>
	`,
	imports: [MatExpansionModule, FormlyModule],
})
export class ExpansionPanelWrapper extends FieldWrapper {}
