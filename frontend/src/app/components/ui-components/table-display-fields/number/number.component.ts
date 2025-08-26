import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import convert from 'convert';

@Component({
  selector: 'app-display-number',
  templateUrl: './number.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './number.component.css'],
  imports: [CommonModule, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class NumberDisplayComponent extends BaseTableDisplayFieldComponent {

  get displayValue(): string {
    if (this.value == null || this.value === '') {
      return '—';
    }

    const unit = this.widgetStructure?.widget_params?.unit;

    if (!unit) {
      return this.value.toString();
    }

    try {
      const convertedValue = convert(parseFloat(this.value), unit).to('best');
      // Format number to max 2 decimal places without trailing zeros
      const formattedQuantity = parseFloat(convertedValue.quantity.toFixed(2)).toString();
      return `${formattedQuantity} ${convertedValue.unit}`;
    } catch (error) {
      console.warn('Unit conversion failed:', error);
      return this.value.toString();
    }
  }

  get isOutOfThreshold(): 'up' | 'down' | false {
    if (this.value == null || this.value === '') {
      return false;
    }

    const thresholdMin = this.widgetStructure?.widget_params?.threshold_min;
    const thresholdMax = this.widgetStructure?.widget_params?.threshold_max;
    const numValue = parseFloat(this.value);

    if (thresholdMin !== null && thresholdMax !== null && numValue < thresholdMin) {
      return 'down';
    }

    if (thresholdMin && thresholdMax === null && numValue < thresholdMin) {
      return 'down';
    }

    if (thresholdMax !== null && thresholdMin !== null && numValue > thresholdMax) {
      return 'up';
    }

    if (thresholdMax && thresholdMin === null && numValue > thresholdMax) {
      return 'up';
    }

    return false;
  }
}
