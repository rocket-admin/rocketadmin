import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import colorString from 'color-string';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
	selector: 'app-edit-color',
	templateUrl: './color.component.html',
	styleUrls: ['./color.component.css'],
	imports: [MatFormFieldModule, MatInputModule, FormsModule],
})
export class ColorEditComponent extends BaseEditFieldComponent {
	readonly value = model<string>();

	static type = 'color';

	get isValidColor(): boolean {
		const val = this.value();
		if (!val) return false;
		return this._parseColor(val) !== null;
	}

	get normalizedColorForPicker(): string {
		const parsed = this._parseColor(this.value());
		if (parsed) {
			const [r, g, b] = parsed.value;
			return `#${this._toHex(r)}${this._toHex(g)}${this._toHex(b)}`;
		}
		return '#000000';
	}

	get formattedColorValue(): string {
		const val = this.value();
		const parsed = this._parseColor(val);
		if (!parsed) return val;

		const format = this.widgetStructure()?.widget_params?.format || 'hex_hash';
		const [r, g, b, a] = parsed.value;

		switch (format) {
			case 'hex':
				return colorString.to.hex(r, g, b, a).slice(1);
			case 'hex_hash':
				return colorString.to.hex(r, g, b, a);
			case 'rgb':
				return colorString.to.rgb(r, g, b, a);
			case 'hsl': {
				const hex = colorString.to.hex(r, g, b, a);
				const hslParsed = colorString.get.hsl(hex);
				if (hslParsed) {
					const [h, s, l, alpha] = hslParsed;
					return colorString.to.hsl(h, s, l, alpha);
				}
				return hex;
			}
			default:
				return colorString.to.hex(r, g, b, a);
		}
	}

	onColorPickerChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const pickerValue = target.value;

		const parsed = this._parseColor(pickerValue);
		if (parsed) {
			const format = this.widgetStructure()?.widget_params?.format || 'hex_hash';
			const [r, g, b, a] = parsed.value;

			switch (format) {
				case 'hex':
					this.value.set(colorString.to.hex(r, g, b, a).slice(1));
					break;
				case 'hex_hash':
					this.value.set(colorString.to.hex(r, g, b, a));
					break;
				case 'rgb':
					this.value.set(colorString.to.rgb(r, g, b, a));
					break;
				case 'hsl': {
					const hex = colorString.to.hex(r, g, b, a);
					const hslParsed = colorString.get.hsl(hex);
					if (hslParsed) {
						const [h, s, l, alpha] = hslParsed;
						this.value.set(colorString.to.hsl(h, s, l, alpha));
					} else {
						this.value.set(hex);
					}
					break;
				}
				default:
					this.value.set(colorString.to.hex(r, g, b, a));
			}
		} else {
			this.value.set(pickerValue);
		}

		this.onFieldChange.emit(this.value());
	}

	onTextInputChange() {
		this.onFieldChange.emit(this.value());
	}

	private _parseColor(color: string): any {
		if (!color) return null;

		const parsed = colorString.get(color);
		if (parsed) return parsed;

		if (/^[A-Fa-f0-9]{6}$|^[A-Fa-f0-9]{3}$/.test(color)) {
			return colorString.get('#' + color);
		}

		return null;
	}

	private _toHex(n: number): string {
		const hex = n.toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	}
}
