import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-filter-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule]
})
export class NumberFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
  @Input() value: number;
  @ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

  static type = 'number';

  ngAfterViewInit(): void {
    if (this.autofocus && this.inputElement) {
      setTimeout(() => {
        this.inputElement.nativeElement.focus();
      }, 100);
    }
  }
}
