import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseRecordViewFieldComponent } from '../base-record-view-field/base-record-view-field.component';

@Component({
	selector: 'app-binary-data-caption-record-view',
	templateUrl: './binary-data-caption.component.html',
	styleUrls: ['../base-record-view-field/base-record-view-field.component.css', './binary-data-caption.component.css'],
	imports: [MatIconModule, MatButtonModule, MatTooltipModule],
})
export class BinaryDataCaptionRecordViewComponent extends BaseRecordViewFieldComponent {}
