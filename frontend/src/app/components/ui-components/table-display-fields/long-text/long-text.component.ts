import { Component, Injectable } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-display-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './long-text.component.css'],
  imports: [CommonModule, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class LongTextDisplayComponent extends BaseTableDisplayFieldComponent {

}
