import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css']
})
export class SelectFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;

  public options: {value: string | null, label: string}[] = [];

  originalOrder = () => { return 0; }


  ngOnInit(): void {
    super.ngOnInit();
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
