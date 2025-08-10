import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import convert from 'convert';

@Injectable()
@Component({
  selector: 'app-display-number',
  templateUrl: './number.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './number.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
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
}
