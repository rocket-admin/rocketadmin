import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-filter-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule]
})
export class LongTextFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
  @Input() value: string;
  @ViewChild('inputElement') inputElement: ElementRef<HTMLTextAreaElement>;

  static type = 'text';
  public rowsCount: string;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      this.rowsCount = this.widgetStructure.widget_params.rows
    } else {
      this.rowsCount = '4'
    };
  }

  ngAfterViewInit(): void {
    if (this.autofocus && this.inputElement) {
      setTimeout(() => {
        this.inputElement.nativeElement.focus();
      }, 100);
    }
  }

}
