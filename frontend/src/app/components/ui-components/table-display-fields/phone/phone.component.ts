import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-phone-display',
  templateUrl: './phone.component.html',
  styleUrls: ['./phone.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class PhoneDisplayComponent extends BaseTableDisplayFieldComponent {
  static type = 'phone';
}
