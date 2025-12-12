import { Component, OnInit } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-select-display',
  templateUrl: './select.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './select.component.css'],
  imports: [CommonModule, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class SelectDisplayComponent extends BaseTableDisplayFieldComponent implements OnInit {
  public displayValue: string;
  public backgroundColor: string;

  ngOnInit(): void {
    this.setDisplayValue();
  }

  private setDisplayValue(): void {
    if (!this.value) {
      this.displayValue = '—';
      return;
    }

    if (this.widgetStructure?.widget_params?.options) {
      // Find the matching option based on value and use its label
      const option = this.widgetStructure.widget_params.options.find(
        (opt: { value: any, label: string }) => opt.value === this.value
      );
      this.displayValue = option ? option.label : this.value;
      this.backgroundColor = option && option.background_color ? option.background_color : 'transparent';
    } else if (this.structure?.data_type_params) {
      // If no widget structure but we have data_type_params, just use the value
      this.displayValue = this.value;
    } else {
      this.displayValue = this.value;
    }
  }
}
