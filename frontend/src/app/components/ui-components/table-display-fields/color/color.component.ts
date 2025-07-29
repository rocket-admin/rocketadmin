import { Component, Injectable } from '@angular/core';

import { BaseTableDisplayFieldComponent } from '../base-table-display-field/base-table-display-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf } from '@angular/common';

@Injectable()
@Component({
  selector: 'app-display-color',
  templateUrl: './color.component.html',
  styleUrls: ['../base-table-display-field/base-table-display-field.component.css', './color.component.css'],
  imports: [NgIf, ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule]
})
export class ColorDisplayComponent extends BaseTableDisplayFieldComponent {
  get isValidColor(): boolean {
    if (!this.value) return false;
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(this.value);
  }
}