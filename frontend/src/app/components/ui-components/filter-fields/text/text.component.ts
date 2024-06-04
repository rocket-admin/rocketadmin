import { Component, Injectable, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Injectable()

@Component({
  selector: 'app-filter-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css']
})
export class TextFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;
  static type = 'text';
}
