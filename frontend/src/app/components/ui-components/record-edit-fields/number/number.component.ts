import { Component, Input, ViewChild, AfterViewInit } from '@angular/core';

import { BaseEditFieldComponent } from '../base-row-field/base-row-field.component';
import { FormsModule, NgModel } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormValidationService } from 'src/app/services/form-validation.service';

@Component({
  selector: 'app-edit-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css'],
  imports: [MatFormFieldModule, MatInputModule, FormsModule]
})
export class NumberEditComponent extends BaseEditFieldComponent implements AfterViewInit {
  @Input() value: number;
  @ViewChild('numberField', { read: NgModel }) numberField: NgModel;

  static type = 'number';

  constructor(private formValidationService: FormValidationService) {
    super();
  }

  ngAfterViewInit(): void {
    // Subscribe to value and status changes
    if (this.numberField) {
      // Initial validation state
      this.updateFieldValidation();
      
      // Listen for changes
      this.numberField.valueChanges?.subscribe(() => {
        this.updateFieldValidation();
      });
      
      this.numberField.statusChanges?.subscribe(() => {
        this.updateFieldValidation();
      });
    }
  }

  private updateFieldValidation(): void {
    if (this.numberField) {
      const fieldIdentifier = `${this.label}-${this.key}`;
      const isValid = this.numberField.valid || (!this.required && (this.value === null || this.value === undefined));
      this.formValidationService.updateFieldValidity(fieldIdentifier, isValid, this.numberField.errors);
    }
  }
}
