import { Component, Injectable } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-display-id',
  templateUrl: './id.component.html',
  styleUrls: ['./id.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class IdDisplayComponent extends BaseTableDisplayFieldComponent {
  // Value is inherited from base component
  static type = 'id';
}
