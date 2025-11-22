import { Component, Injectable, OnInit } from '@angular/core';

import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-select-record-view',
  templateUrl: './select.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './select.component.css'],
  imports: []
})
export class SelectRecordViewComponent extends BaseRecordViewFieldComponent implements OnInit {
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
