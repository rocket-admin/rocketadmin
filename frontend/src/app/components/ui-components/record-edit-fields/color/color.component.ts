import { Component, Injectable, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import colorString from 'color-string';

@Injectable()

@Component({
  selector: 'app-edit-color',
  templateUrl: './color.component.html',
  styleUrls: ['./color.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class ColorEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  static type = 'color';

  get isValidColor(): boolean {
    if (!this.value) return false;
    return this.parseColor(this.value) !== null;
  }

  get normalizedColorForPicker(): string {
    const parsed = this.parseColor(this.value);
    if (parsed) {
      const [r, g, b] = parsed.value;
      return `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`;
    }
    return '#000000';
  }

  get formattedColorValue(): string {
    const parsed = this.parseColor(this.value);
    if (!parsed) return this.value;

    const format = this.widgetStructure?.widget_params?.format || 'hex_hash';
    const [r, g, b, a] = parsed.value;

    switch (format) {
      case 'hex':
        return colorString.to.hex(r, g, b, a).slice(1); // Remove # prefix
      case 'hex_hash':
        return colorString.to.hex(r, g, b, a);
      case 'rgb':
        return colorString.to.rgb(r, g, b, a);
      case 'hsl':
        // Convert RGB to HSL using built-in conversion
        const hex = colorString.to.hex(r, g, b, a);
        const hslParsed = colorString.get.hsl(hex);
        if (hslParsed) {
          const [h, s, l, alpha] = hslParsed;
          return colorString.to.hsl(h, s, l, alpha);
        }
        return hex;
      default:
        return colorString.to.hex(r, g, b, a);
    }
  }

  private parseColor(color: string): any {
    if (!color) return null;
    
    // Try parsing with color-string
    const parsed = colorString.get(color);
    if (parsed) return parsed;
    
    // Try hex without hash
    if (/^[A-Fa-f0-9]{6}$|^[A-Fa-f0-9]{3}$/.test(color)) {
      return colorString.get('#' + color);
    }
    
    return null;
  }

  private toHex(n: number): string {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }

  onColorPickerChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const pickerValue = target.value;
    
    // Convert picker value to desired format
    const parsed = this.parseColor(pickerValue);
    if (parsed) {
      const format = this.widgetStructure?.widget_params?.format || 'hex_hash';
      
      const [r, g, b, a] = parsed.value;
      
      switch (format) {
        case 'hex':
          this.value = colorString.to.hex(r, g, b, a).slice(1);
          break;
        case 'hex_hash':
          this.value = colorString.to.hex(r, g, b, a);
          break;
        case 'rgb':
          this.value = colorString.to.rgb(r, g, b, a);
          break;
        case 'hsl':
          // Convert RGB to HSL using built-in conversion
          const hex = colorString.to.hex(r, g, b, a);
          const hslParsed = colorString.get.hsl(hex);
          if (hslParsed) {
            const [h, s, l, alpha] = hslParsed;
            this.value = colorString.to.hsl(h, s, l, alpha);
          } else {
            this.value = hex;
          }
          break;
        default:
          this.value = colorString.to.hex(r, g, b, a);
      }
    } else {
      this.value = pickerValue;
    }
    
    this.onFieldChange.emit(this.value);
  }

  onTextInputChange() {
    this.onFieldChange.emit(this.value);
  }
}