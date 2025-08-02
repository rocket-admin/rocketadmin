import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-range-display',
  standalone: true,
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.css'],
  imports: [
    CommonModule,
    MatProgressBarModule
  ],
})
export class RangeDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit, OnChanges {
  @Input() declare value: number;
  static type = 'range';

  public min: number = 0;
  public max: number = 100;
  public displayValue: string = '';

  ngOnInit(): void {
    this._parseWidgetParams();
    this._updateDisplayValue();
  }

  ngOnChanges(): void {
    this._parseWidgetParams();
    this._updateDisplayValue();
  }

  public getProgressValue(): number {
    const numValue = Number(this.value) || 0;
    const range = this.max - this.min;
    if (range === 0) return 0;
    const progress = ((numValue - this.min) / range) * 100;
    // Ensure progress is between 0 and 100
    return Math.max(0, Math.min(100, progress));
  }

  private _parseWidgetParams(): void {
    if (this.widgetStructure?.widget_params) {
      try {
        const params = this.widgetStructure.widget_params;
        if (params.min !== undefined) {
          this.min = Number(params.min) || 0;
        }
        if (params.max !== undefined) {
          this.max = Number(params.max) || 100;
        }
      } catch (error) {
        console.error('Failed to parse widget params:', error);
      }
    }
  }

  private _updateDisplayValue(): void {
    const numValue = Number(this.value) || 0;
    this.displayValue = `${numValue} / ${this.max}`;
  }
}