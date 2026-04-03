import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
	selector: 'app-filter-long-text',
	templateUrl: './long-text.component.html',
	styleUrls: ['./long-text.component.css'],
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
})
export class LongTextFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
	@Input() value: string;
	@ViewChild('inputElement') inputElement: ElementRef<HTMLTextAreaElement>;

	static type = 'text';
	public rowsCount: string;

	ngOnInit(): void {
		const ws = this.widgetStructure();
		if (ws?.widget_params) {
			this.rowsCount = ws.widget_params.rows;
		} else {
			this.rowsCount = '4';
		}
	}

	ngAfterViewInit(): void {
		if (this.autofocus() && this.inputElement) {
			setTimeout(() => {
				this.inputElement.nativeElement.focus();
			}, 100);
		}
	}
}
