import { AfterViewInit, Component, ElementRef, Injectable, Input, ViewChild } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Injectable()

@Component({
  selector: 'app-filter-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule]
})
export class TextFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
  @Input() value: string;
  @ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

  static type = 'text';

  ngAfterViewInit(): void {
    if (this.autofocus && this.inputElement) {
      setTimeout(() => {
        this.inputElement.nativeElement.focus();
      }, 100);
    }
  }
}
