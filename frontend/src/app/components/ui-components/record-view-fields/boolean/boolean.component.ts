import { Component, Injectable } from '@angular/core';


import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Injectable()
@Component({
  selector: 'app-display-boolean',
  templateUrl: './boolean.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './boolean.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class BooleanRecordViewComponent extends BaseRecordViewFieldComponent {
}
