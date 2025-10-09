import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-filter-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.css'],
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule]
})
export class PasswordFilterComponent extends BaseFilterFieldComponent implements AfterViewInit {
  @Input() value: string;
  @ViewChild('inputElement') inputElement: ElementRef<HTMLInputElement>;

  public clearPassword: boolean;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.value === '***') this.value = '';
    this.onFieldChange.emit(this.value);
  }

  ngAfterViewInit(): void {
    if (this.autofocus && this.inputElement) {
      setTimeout(() => {
        this.inputElement.nativeElement.focus();
      }, 100);
    }
  }

  onClearPasswordChange() {
    if (this.clearPassword) this.onFieldChange.emit(null);
  }
}
