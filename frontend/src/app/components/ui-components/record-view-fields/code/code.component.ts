import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Injectable()
@Component({
  selector: 'app-code-display',
  templateUrl: './code.component.html',
  styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './code.component.css'],
  imports: [ClipboardModule, MatIconModule, MatButtonModule, MatTooltipModule, CommonModule]
})
export class CodeRecordViewComponent extends BaseRecordViewFieldComponent {
}
