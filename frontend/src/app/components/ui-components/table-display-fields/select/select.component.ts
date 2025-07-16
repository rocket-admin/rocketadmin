import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-select-display',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class SelectDisplayComponent extends BaseTableDisplayFieldComponent {
  static type = 'select';
}
