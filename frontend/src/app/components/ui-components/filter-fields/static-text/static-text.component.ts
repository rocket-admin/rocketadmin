import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-static-text',
  templateUrl: './static-text.component.html',
  styleUrls: ['./static-text.component.css']
})
export class StaticTextFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;
}
