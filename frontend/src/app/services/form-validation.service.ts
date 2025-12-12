import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface FieldValidationState {
  isValid: boolean;
  errors: any;
  fieldIdentifier: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormValidationService {
  private fieldStates = new Map<string, FieldValidationState>();
  private formValidSubject = new BehaviorSubject<boolean>(true);

  public formValid$: Observable<boolean> = this.formValidSubject.asObservable();

  constructor() { }

  /**
   * Update the validity state of a field
   */
  updateFieldValidity(fieldIdentifier: string, isValid: boolean, errors: any = null): void {
    this.fieldStates.set(fieldIdentifier, {
      fieldIdentifier,
      isValid,
      errors
    });
    this.updateFormValidity();
  }

  /**
   * Check if the entire form is valid
   */
  isFormValid(): boolean {
    if (this.fieldStates.size === 0) {
      return true;
    }

    for (const [_, state] of this.fieldStates) {
      if (!state.isValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get list of invalid field identifiers
   */
  getInvalidFields(): string[] {
    const invalidFields: string[] = [];

    for (const [fieldIdentifier, state] of this.fieldStates) {
      if (!state.isValid) {
        invalidFields.push(fieldIdentifier);
      }
    }

    return invalidFields;
  }

  /**
   * Get validation errors for a specific field
   */
  getFieldErrors(fieldIdentifier: string): any {
    return this.fieldStates.get(fieldIdentifier)?.errors || null;
  }

  /**
   * Clear all validation states
   */
  clearAll(): void {
    this.fieldStates.clear();
    this.updateFormValidity();
  }

  /**
   * Remove a specific field from validation tracking
   */
  removeField(fieldIdentifier: string): void {
    this.fieldStates.delete(fieldIdentifier);
    this.updateFormValidity();
  }

  /**
   * Update the form validity observable
   */
  private updateFormValidity(): void {
    this.formValidSubject.next(this.isFormValid());
  }

  /**
   * Get all field states (useful for debugging)
   */
  getAllFieldStates(): Map<string, FieldValidationState> {
    return new Map(this.fieldStates);
  }
}
