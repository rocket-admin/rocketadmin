import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-range-edit',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
})
export class RangeEditComponent extends BaseEditFieldComponent {
  @ViewChild('rangeInput') rangeInput: ElementRef<HTMLInputElement>;
  @Input() value: number;
  static type = 'range';

  public min: number = 0;
  public max: number = 100;

  override ngOnInit(): void {
    super.ngOnInit();
    this._parseWidgetParams();
  }

  ngOnChanges(): void {
    this._parseWidgetParams();
  }

  public onValueChange(newValue: number): void {
    this.value = newValue;
    this.onFieldChange.emit(this.value);
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
}