import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-row-select',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatOptionModule],
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SelectRowComponent extends BaseRowFieldComponent {
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
