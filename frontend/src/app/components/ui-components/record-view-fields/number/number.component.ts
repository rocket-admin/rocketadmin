import { Component, Injectable } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import convert from 'convert';

@Injectable()
@Component({
  selector: 'app-number-record-view',
  templateUrl: './number.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './number.component.css'],
  imports: [CommonModule, MatIconModule]
})
export class NumberRecordViewComponent extends BaseRecordViewFieldComponent {

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

    if (thresholdMin !== undefined && numValue < thresholdMin) {
      return 'down';
    }

    if (thresholdMax !== undefined && numValue > thresholdMax) {
      return 'up';
    }

    return false;
  }
}
