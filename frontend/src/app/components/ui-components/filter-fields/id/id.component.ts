import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-id',
  templateUrl: './id.component.html',
  styleUrls: ['./id.component.css']
})
export class IdFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;
}
