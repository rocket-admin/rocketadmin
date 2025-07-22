import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-binary-data-caption-display',
  templateUrl: './binary-data-caption.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './binary-data-caption.component.css'],
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class BinaryDataCaptionDisplayComponent extends BaseTableDisplayFieldComponent {
}
