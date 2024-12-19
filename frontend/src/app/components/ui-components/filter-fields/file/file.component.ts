import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-filter-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.css'],
  imports: [CommonModule]
})
export class FileFilterComponent extends BaseFilterFieldComponent {
  static type = 'file';

  constructor() {
    super();
  }
}
