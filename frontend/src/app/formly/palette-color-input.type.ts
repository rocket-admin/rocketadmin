import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';

@Component({
	selector: 'formly-palette-color-input',
	template: `
		<input
			type="color"
			class="color-input"
			[value]="toHex(formControl.value)"
			(input)="formControl.setValue($any($event.target).value)" />
	`,
	styles: [
		`
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
		`,
	],
	imports: [ReactiveFormsModule],
})
export class PaletteColorInputType extends FieldType<FieldTypeConfig> {
	toHex(color: string | undefined): string {
		if (!color) return '#6366f1';
		if (color.startsWith('#')) return color.substring(0, 7);
		const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if (!match) return '#000000';
		const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
		const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
		const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
		return `#${r}${g}${b}`;
	}
}
