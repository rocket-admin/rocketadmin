import { Component, Input } from '@angular/core';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-row-static-text',
  imports: [CommonModule],
  templateUrl: './static-text.component.html',
  styleUrls: ['./static-text.component.css']
})
export class StaticTextRowComponent extends BaseRowFieldComponent {
  @Input() value: string;
}
