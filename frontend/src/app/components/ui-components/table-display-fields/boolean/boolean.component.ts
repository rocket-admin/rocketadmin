import { Component, Injectable } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-display-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './boolean.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class BooleanDisplayComponent extends BaseTableDisplayFieldComponent {
  // Value is inherited from base component
  static type = 'boolean';
}
