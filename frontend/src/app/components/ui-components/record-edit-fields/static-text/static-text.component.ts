import { Component, Input } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-edit-static-text',
  imports: [CommonModule],
  templateUrl: './static-text.component.html',
  styleUrls: ['./static-text.component.css']
})
export class StaticTextEditComponent extends BaseEditFieldComponent {
  @Input() value: string;
}
