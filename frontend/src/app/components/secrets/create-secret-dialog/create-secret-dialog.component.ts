import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Angulartics2 } from 'angulartics2';

import { SecretsService } from 'src/app/services/secrets.service';

@Component({
  selector: 'app-create-secret-dialog',
  templateUrl: './create-secret-dialog.component.html',
  styleUrls: ['./create-secret-dialog.component.css'],
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatIconModule,
    MatTooltipModule,
  ]
})
export class CreateSecretDialogComponent {
  public form: FormGroup;
  public submitting = false;
  public showValue = false;
  public showMasterPassword = false;
  public minDate = new Date();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateSecretDialogComponent>,
    private _secrets: SecretsService,
    private angulartics2: Angulartics2
  ) {
    this.form = this.fb.group({
      slug: ['', [
        Validators.required,
        Validators.maxLength(255),
        Validators.pattern(/^[a-zA-Z0-9_-]+$/)
      ]],
      value: ['', [Validators.required, Validators.maxLength(10000)]],
      expiresAt: [null],
      masterEncryption: [false],
      masterPassword: [''],
    });

    this.form.get('masterEncryption')?.valueChanges.subscribe(enabled => {
      const masterPasswordControl = this.form.get('masterPassword');
      if (enabled) {
        masterPasswordControl?.setValidators([Validators.required, Validators.minLength(8)]);
      } else {
        masterPasswordControl?.clearValidators();
        masterPasswordControl?.setValue('');
      }
      masterPasswordControl?.updateValueAndValidity();
    });
  }

  get slugError(): string {
    const control = this.form.get('slug');
    if (control?.hasError('required')) return 'Slug is required';
    if (control?.hasError('maxlength')) return 'Slug must be 255 characters or less';
    if (control?.hasError('pattern')) return 'Only letters, numbers, hyphens, and underscores allowed';
    return '';
  }

  get valueError(): string {
    const control = this.form.get('value');
    if (control?.hasError('required')) return 'Value is required';
    if (control?.hasError('maxlength')) return 'Value must be 10000 characters or less';
    return '';
  }

  get masterPasswordError(): string {
    const control = this.form.get('masterPassword');
    if (control?.hasError('required')) return 'Master password is required for encryption';
    if (control?.hasError('minlength')) return 'Master password must be at least 8 characters';
    return '';
  }

  toggleValueVisibility(): void {
    this.showValue = !this.showValue;
  }

  toggleMasterPasswordVisibility(): void {
    this.showMasterPassword = !this.showMasterPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    const formValue = this.form.value;

    const payload = {
      slug: formValue.slug,
      value: formValue.value,
      expiresAt: formValue.expiresAt ? new Date(formValue.expiresAt).toISOString() : undefined,
      masterEncryption: formValue.masterEncryption || undefined,
      masterPassword: formValue.masterEncryption ? formValue.masterPassword : undefined,
    };

    this._secrets.createSecret(payload).subscribe({
      next: () => {
        this.angulartics2.eventTrack.next({
          action: 'Secrets: secret created successfully',
        });
        this.submitting = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
