import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldArrayType, FormlyModule } from '@ngx-formly/core';
import { DEFAULT_COLOR_PALETTE } from 'src/app/lib/chart-config.helper';

@Component({
	selector: 'formly-color-palette',
	template: `
		<div class="option-group">
			<div class="palette-colors">
				@for (f of field.fieldGroup; track f.id) {
					<div class="palette-color-item">
						<formly-field [field]="f"></formly-field>
						<button mat-icon-button (click)="remove($index)" matTooltip="Remove color" class="color-remove-button" type="button">
							<mat-icon>close</mat-icon>
						</button>
					</div>
				}
			</div>
			<div class="palette-actions">
				<button mat-stroked-button (click)="add()" class="add-color-button" type="button">
					<mat-icon>add</mat-icon> Add color
				</button>
				@if (field.fieldGroup!.length === 0) {
					<button mat-stroked-button (click)="loadDefaults()" class="add-color-button" type="button">
						<mat-icon>palette</mat-icon> Load defaults
					</button>
				}
			</div>
		</div>
	`,
	styles: [
		`
			.option-group {
				display: flex;
				flex-direction: column;
				gap: 12px;
				padding: 4px 0;
			}
			.palette-colors {
				display: flex;
				flex-wrap: wrap;
				gap: 8px;
			}
			.palette-color-item {
				display: flex;
				align-items: center;
				gap: 2px;
			}
			.color-remove-button {
				width: 24px !important;
				height: 24px !important;
				line-height: 24px !important;
			}
			.color-remove-button mat-icon {
				font-size: 14px;
				width: 14px;
				height: 14px;
			}
			.palette-actions {
				display: flex;
				gap: 8px;
				flex-wrap: wrap;
				margin-top: 4px;
			}
			.add-color-button {
				font-size: 13px;
			}
			.add-color-button mat-icon {
				font-size: 18px;
				width: 18px;
				height: 18px;
			}
		`,
	],
	imports: [FormlyModule, MatButtonModule, MatIconModule, MatTooltipModule],
})
export class ColorPaletteType extends FieldArrayType {
	loadDefaults(): void {
		const formArray = this.formControl;
		while (formArray.length) {
			this.remove(0);
		}
		DEFAULT_COLOR_PALETTE.forEach(() => this.add());
		formArray.patchValue(DEFAULT_COLOR_PALETTE);
	}
}
