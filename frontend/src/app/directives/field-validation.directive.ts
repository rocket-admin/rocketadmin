import { Directive, Input, OnDestroy, Optional } from '@angular/core';
import { NgModel } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormValidationService } from '../services/form-validation.service';

@Directive({
  selector: '[fieldValidation][ngModel]'
})
export class FieldValidationDirective implements OnDestroy {
  @Input() fieldKey: string;
  @Input() fieldLabel: string;
  @Input() fieldRequired: boolean = false;

  private destroy$ = new Subject<void>();
  private fieldIdentifier: string;

  constructor(
    @Optional() private ngModel: NgModel,
    private formValidationService: FormValidationService
  ) {}

  ngAfterViewInit(): void {
    if (!this.ngModel) {
      console.warn('FieldValidationDirective requires ngModel');
      return;
    }

    // Create unique field identifier
    this.fieldIdentifier = `${this.fieldLabel}-${this.fieldKey}`;

    // Initial validation state
    this.updateValidation();

    // Subscribe to value changes
    if (this.ngModel.valueChanges) {
      this.ngModel.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateValidation();
        });
    }

    // Subscribe to status changes
    if (this.ngModel.statusChanges) {
      this.ngModel.statusChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateValidation();
        });
    }
  }

  private updateValidation(): void {
    if (!this.ngModel || !this.fieldIdentifier) {
      return;
    }

    const value = this.ngModel.value;
    const errors = this.ngModel.errors;

    // Determine if field is valid
    // A field is valid if:
    // 1. It has no errors
    // 2. OR it's not required and is empty/null/undefined
    const isValid =
      !errors ||
      (!this.fieldRequired && (value === null || value === undefined || value === ''));

    this.formValidationService.updateFieldValidity(
      this.fieldIdentifier,
      isValid,
      errors
    );
  }

  ngOnDestroy(): void {
    // Clean up subscription
    this.destroy$.next();
    this.destroy$.complete();

    // Remove field from validation service
    if (this.fieldIdentifier) {
      this.formValidationService.removeField(this.fieldIdentifier);
    }
  }
}
