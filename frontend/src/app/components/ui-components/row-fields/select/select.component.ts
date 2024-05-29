import { Component, Input, OnInit } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';

@Component({
  selector: 'app-row-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css']
})
export class SelectRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  public options: {value: string | null, label: string}[] = [];

  originalOrder = () => { return 0; }

  ngOnInit(): void {
    if (this.widgetStructure) {
      this.options = this.widgetStructure.widget_params.options;
      if (this.widgetStructure.widget_params.allow_null) {
        this.options = [{ value: null, label: '' }, ...this.options];
      }
    } else if (this.structure) {
      this.options = this.structure.data_type_params.map((option) => {
        return { value: option, label: option };
      });
      if (this.structure.allow_null) {
        this.options = [{ value: null, label: '' }, ...this.options];
      }
    }
  }
}
