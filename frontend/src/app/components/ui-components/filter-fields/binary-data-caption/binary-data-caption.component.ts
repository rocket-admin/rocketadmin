import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-static-text',
	templateUrl: './binary-data-caption.component.html',
	styleUrls: ['./binary-data-caption.component.css'],
	imports: [CommonModule],
})
export class BinaryDataCaptionFilterComponent extends BaseFilterFieldComponent {}
