import { Component, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-edit-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class LongTextEditComponent extends BaseEditFieldComponent {
  @Input() value: string;

  static type = 'text';
  public rowsCount: string;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      this.rowsCount = this.widgetStructure.widget_params.rows
    } else {
      this.rowsCount = '4'
    };
  }

}
