import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
	selector: 'formly-color-picker',
	template: `
		<div class="series-color-picker">
			<span class="color-picker-label">{{ props.label || 'Color' }}</span>
			<div class="color-picker-row">
				<input
					type="color"
					class="color-input"
					[value]="formControl.value || '#6366f1'"
					(input)="formControl.setValue($any($event.target).value)" />
				@if (formControl.value) {
					<button type="button" class="color-reset-btn" (click)="formControl.setValue(null)">
						<span class="color-reset-x">&times;</span>
					</button>
				}
				@if (!formControl.value) {
					<span class="color-auto-label">Auto</span>
				}
			</div>
		</div>
	`,
	styles: [
		`
			.series-color-picker {
				display: flex;
				flex-direction: column;
				gap: 4px;
				min-width: 80px;
			}
			.color-picker-label {
				font-size: 12px;
				color: rgba(0, 0, 0, 0.6);
			}
			@media (prefers-color-scheme: dark) {
				.color-picker-label {
					color: rgba(255, 255, 255, 0.6);
				}
			}
			.color-picker-row {
				display: flex;
				align-items: center;
				gap: 6px;
			}
			.color-input {
				width: 36px;
				height: 36px;
				padding: 2px;
				border: 1px solid rgba(0, 0, 0, 0.12);
				border-radius: 4px;
				cursor: pointer;
				background: none;
			}
			@media (prefers-color-scheme: dark) {
				.color-input {
					border-color: rgba(255, 255, 255, 0.12);
				}
			}
			.color-input::-webkit-color-swatch-wrapper {
				padding: 2px;
			}
			.color-input::-webkit-color-swatch {
				border: none;
				border-radius: 2px;
			}
			.color-reset-btn {
				width: 24px;
				height: 24px;
				border: none;
				background: none;
				cursor: pointer;
				padding: 0;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.color-reset-x {
				font-size: 16px;
				color: rgba(0, 0, 0, 0.54);
			}
			@media (prefers-color-scheme: dark) {
				.color-reset-x {
					color: rgba(255, 255, 255, 0.54);
				}
			}
			.color-auto-label {
				font-size: 12px;
				color: rgba(0, 0, 0, 0.38);
			}
			@media (prefers-color-scheme: dark) {
				.color-auto-label {
					color: rgba(255, 255, 255, 0.38);
				}
			}
		`,
	],
	imports: [ReactiveFormsModule],
})
export class ColorPickerType extends FieldType<FieldTypeConfig> {}
