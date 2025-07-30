import { Component, Injectable } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf } from '@angular/common';
import colorString from 'color-string';

@Injectable()
@Component({
  selector: 'app-display-color',
  templateUrl: './color.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './color.component.css'],
  imports: [NgIf, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class ColorDisplayComponent extends BaseTableDisplayFieldComponent {
  get isValidColor(): boolean {
    if (!this.value) return false;
    return this.parseColor(this.value) !== null;
  }

  get normalizedColorForDisplay(): string {
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
}