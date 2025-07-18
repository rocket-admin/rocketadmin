import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-display-static-text',
  templateUrl: './static-text.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './static-text.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class StaticTextDisplayComponent extends BaseTableDisplayFieldComponent {
  static type = 'static-text';
}
