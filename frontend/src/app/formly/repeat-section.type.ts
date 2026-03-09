import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldArrayType, FormlyModule } from '@ngx-formly/core';

@Component({
	selector: 'formly-repeat-section',
	template: `
		<div class="series-section">
			<div class="section-header">
				<h4>{{ props.label }}</h4>
				@if (!props['maxItems'] || field.fieldGroup!.length < props['maxItems']) {
					<button mat-stroked-button (click)="add()" class="add-series-button" type="button">
						<mat-icon>add</mat-icon> {{ props['addText'] || 'Add' }}
					</button>
				}
			</div>

			@for (f of field.fieldGroup; track $index) {
				<div class="series-card">
					<div class="series-card-header">
						<span class="series-number">{{ props['itemLabel'] || 'Item' }} {{ $index + 1 }}</span>
						@if (field.fieldGroup!.length > 1) {
							<button mat-icon-button (click)="remove($index)" matTooltip="Remove" class="remove-series-button" type="button">
								<mat-icon>close</mat-icon>
							</button>
						}
					</div>
					<formly-field [field]="f"></formly-field>
				</div>
			}
		</div>
	`,
	styles: [
		`
			.series-section {
				display: flex;
				flex-direction: column;
				gap: 12px;
			}
			.section-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 16px;
			}
			.section-header h4 {
				margin: 0;
				font-size: 14px;
				font-weight: 500;
			}
			.add-series-button {
				font-size: 13px;
			}
			.add-series-button mat-icon {
				font-size: 18px;
				width: 18px;
				height: 18px;
			}
			.series-card {
				border: 1px solid rgba(0, 0, 0, 0.12);
				border-radius: 4px;
				padding: 12px;
			}
			@media (prefers-color-scheme: dark) {
				.series-card {
					border-color: rgba(255, 255, 255, 0.12);
				}
			}
			.series-card-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 8px;
			}
			.series-number {
				font-size: 12px;
				font-weight: 500;
				text-transform: uppercase;
				color: rgba(0, 0, 0, 0.54);
			}
			@media (prefers-color-scheme: dark) {
				.series-number {
					color: rgba(255, 255, 255, 0.54);
				}
			}
			.remove-series-button {
				width: 28px !important;
				height: 28px !important;
				line-height: 28px !important;
			}
			.remove-series-button mat-icon {
				font-size: 16px;
				width: 16px;
				height: 16px;
			}
		`,
	],
	imports: [FormlyModule, MatButtonModule, MatIconModule, MatTooltipModule],
})
export class RepeatSectionType extends FieldArrayType {}
